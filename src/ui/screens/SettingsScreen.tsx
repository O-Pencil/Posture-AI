/**
 * @file SettingsScreen.tsx
 * @description 设置屏：模型管理（含设备指标折叠）、模型基准测试、数据源、F7 演示台、关于。
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {ModelDownloadCard} from '../components/ModelDownloadCard';
import {BenchmarkPanel} from './BenchmarkScreen';
import {MockScenario, SCENARIOS} from '../../posture/mock';
import {DashboardState} from '../../posture/types';
import {MemoryService} from '../../posture/memory/service';
import {MemoryItem, MemoryType} from '../../posture/memory/types';

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
