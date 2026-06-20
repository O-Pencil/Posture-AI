/**
 * @file SettingsScreen.tsx
 * @description 设置屏：模型管理（含设备指标折叠）、模型基准测试、数据源、F7 演示台、关于。
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {ModelDownloadCard} from '../components/ModelDownloadCard';
import {LogConsole} from '../components/LogConsole';
import {BenchmarkPanel} from './BenchmarkScreen';
import {MockScenario, SCENARIOS} from '../../posture/mock';
import {DashboardState} from '../../posture/types';
import {MemoryService} from '../../posture/memory/service';
import {MemoryItem, MemoryType} from '../../posture/memory/types';
import {loadAssessConfig, saveAssessConfig} from '../../assess/config';
import {AssessBackend, AssessConfig, DEFAULT_ASSESS_CONFIG} from '../../assess/types';
import {AssessReadiness, checkAssessReadiness} from '../../assess/readiness';

export type DataMode = 'loading' | 'sensor' | 'mock';

type Props = {
  state: DashboardState;
  mode: DataMode;
  memory?: MemoryService;
  onUseSensor: () => void;
  onUseMock: () => void;
  onScenario: (s: MockScenario) => void;
};

const TYPE_LABEL: Record<MemoryType, string> = {
  preference: '偏好',
  struggle: '易不适',
  lesson: '有效',
  pattern: '习惯',
  decision: '目标',
  knowledge: '环境',
  entity: '称呼',
};

// 口语化标签（不暴露云端/端侧/VL）。手机本地优先展示。
const ASSESS_BACKENDS: Array<{key: AssessBackend; label: string}> = [
  {key: 'local', label: '手机本地'},
  {key: 'cloud', label: '联网评估'},
  {key: 'preset', label: '示例'},
];

function AssessConfigCard(): React.JSX.Element {
  const [cfg, setCfg] = useState<AssessConfig>(DEFAULT_ASSESS_CONFIG);
  const [saved, setSaved] = useState(false);
  const [readiness, setReadiness] = useState<AssessReadiness | null>(null);

  useEffect(() => {
    loadAssessConfig().then(setCfg);
  }, []);
  // 后端/Key 变化时重算就绪与设备推荐
  useEffect(() => {
    checkAssessReadiness(cfg).then(setReadiness).catch(() => setReadiness(null));
  }, [cfg]);

  const setBackend = (backend: AssessBackend) => {
    setCfg(c => ({...c, backend}));
    setSaved(false);
  };
  const setCloud = (patch: Partial<AssessConfig['cloud']>) => {
    setCfg(c => ({...c, cloud: {...c.cloud, ...patch}}));
    setSaved(false);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>AI 体态评估</Text>
      {readiness ? (
        <Text style={styles.assessRec}>
          推荐「{readiness.recommend === 'local' ? '手机本地' : '联网评估'}」 · {readiness.recommendReason}
        </Text>
      ) : null}
      <View style={styles.rowGap}>
        {ASSESS_BACKENDS.map(b => (
          <Pill key={b.key} active={cfg.backend === b.key} label={b.label} onPress={() => setBackend(b.key)} />
        ))}
      </View>

      {cfg.backend === 'local' && readiness ? (
        <Text style={[styles.hint, readiness.ready ? styles.assessOk : undefined]}>
          {readiness.ready ? '「手机本地」已就绪 ✓' : `「手机本地」${readiness.hint ?? '需要先下载评估专用模型'}`}
        </Text>
      ) : null}

      {cfg.backend === 'cloud' ? (
        <View style={styles.cloudForm}>
          <Text style={styles.hint}>「联网评估」需要填一次服务信息（一般由团队提前配好）。</Text>
          <TextInput
            style={styles.input}
            value={cfg.cloud.baseURL}
            onChangeText={t => setCloud({baseURL: t})}
            placeholder="服务地址（baseURL）"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={cfg.cloud.apiKey}
            onChangeText={t => setCloud({apiKey: t})}
            placeholder="服务密钥"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={cfg.cloud.model}
            onChangeText={t => setCloud({model: t})}
            placeholder="评估模型名称（如 qwen-vl-max）"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
          />
        </View>
      ) : null}

      <Pressable
        style={styles.saveBtn}
        onPress={() => {
          saveAssessConfig(cfg);
          setSaved(true);
        }}>
        <Text style={styles.saveBtnText}>{saved ? '已保存 ✓' : '保存'}</Text>
      </Pressable>
      <Text style={styles.hint}>信息只存在手机本机、不会上传。临时用不了时会先给示例结果。</Text>
    </Card>
  );
}

function MemoryCard({memory}: {memory?: MemoryService}): React.JSX.Element | null {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const refresh = useCallback(() => setItems(memory ? memory.list() : []), [memory]);

  useEffect(() => {
    if (memory) {
      memory.ready.then(refresh);
    }
  }, [memory, refresh]);

  if (!memory) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.memHeader}>
        <Text style={styles.cardTitle}>教练记忆</Text>
        {items.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              memory.clearAll();
              refresh();
            }}>
            <Text style={styles.memClear}>清空</Text>
          </Pressable>
        ) : null}
      </View>
      {items.length === 0 ? (
        <Text style={styles.hint}>教练还没记住什么。聊几句、给建议点赞，它会越来越懂你。仅存本机。</Text>
      ) : (
        items.map(it => (
          <View key={it.id} style={styles.memRow}>
            <Text style={styles.memTag}>{TYPE_LABEL[it.type]}</Text>
            <Text style={styles.memText} numberOfLines={2}>
              {it.text}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                memory.forget(it.id);
                refresh();
              }}>
              <Text style={styles.memDelete}>✕</Text>
            </Pressable>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.surface},
  container: {padding: theme.spacing.lg, paddingTop: 8, paddingBottom: 120},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightHeavy, marginBottom: 16},
  card: {marginBottom: theme.spacing.md},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginBottom: 12},
  rowGap: {flexDirection: 'row', gap: theme.spacing.sm},
  wrapRow: {flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 18},
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  pillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  pillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm},
  pillTextActive: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
  memHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  memClear: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  memRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  memTag: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: theme.font.weightBold,
    backgroundColor: '#FCEAE0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  memText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, flex: 1, lineHeight: 18},
  memDelete: {color: theme.colors.textMuted, fontSize: 14, fontWeight: theme.font.weightBold},
  assessRec: {color: theme.colors.primary, fontSize: theme.font.sizeXs, marginTop: 4, marginBottom: 10, lineHeight: 17},
  assessOk: {color: '#3A9E1F'},
  cloudForm: {marginTop: 12, gap: 8},
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.font.sizeSm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  saveBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
});

function Pill({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsScreen({state, mode, memory, onUseSensor, onUseMock, onScenario}: Props): React.JSX.Element {
  const [mnnRefreshKey, setMnnRefreshKey] = useState(0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>设置</Text>

      <ModelDownloadCard onModelsChanged={() => setMnnRefreshKey(k => k + 1)} />

      <BenchmarkPanel refreshKey={mnnRefreshKey} />

      <LogConsole />

      <AssessConfigCard />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>数据源</Text>
        <View style={styles.rowGap}>
          <Pill active={mode === 'sensor'} label="手机传感器" onPress={onUseSensor} />
          <Pill active={mode === 'mock'} label="模拟" onPress={onUseMock} />
        </View>
        <Text style={styles.hint}>
          {mode === 'sensor' ? '正在用手机 IMU（前后/左右倾斜手机）。' : mode === 'mock' ? '正在用本地模拟流。' : '检测传感器中…'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>F7 演示台</Text>
        <View style={styles.wrapRow}>
          {SCENARIOS.map((s: MockScenario) => (
            <Pill
              key={s}
              active={mode === 'mock' && state.posture === s}
              label={s.replace('_', ' ')}
              onPress={() => onScenario(s)}
            />
          ))}
        </View>
        <Text style={styles.hint}>一键切换演示姿态（自动切到模拟数据源）。</Text>
      </Card>

      <MemoryCard memory={memory} />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>关于</Text>
        <Text style={styles.hint}>Catune · 不驼背坐姿助手。健康管理辅助，非医疗诊断。</Text>
      </Card>
    </ScrollView>
  );
}
