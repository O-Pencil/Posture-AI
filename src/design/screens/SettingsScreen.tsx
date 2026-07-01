/**
 * @file SettingsScreen.tsx
 * @description 设置屏：模型管理（含设备指标折叠）、模型基准测试、数据源、F7 演示台、关于。
 *
 * [WHO] 导出 `SettingsScreen`、`DataMode`
 * [FROM] 依赖 `react`、`react-native`、`../theme`、`../primitives`、`../components/ModelDownloadCard`、
 *   `./BenchmarkScreen`、`../../posture/mock`、`../../posture/types`、`../../posture/memory/service`、
 *   `../../assess/config`、`../../assess/types`、`../../assess/readiness`、`@tabler/icons-react-native`
 * [TO] 被 `AppShell` 在 settings tab 渲染
 * [HERE] src/design/screens/SettingsScreen.tsx · 设置页布局
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Button, Card, Chip, Field, SegmentedControl} from '../primitives';
import {ModelDownloadCard} from '../components/ModelDownloadCard';
import {BenchmarkPanel} from './BenchmarkScreen';
import {MockScenario, SCENARIOS} from '../../posture/mock';
import {DashboardState} from '../../posture/types';
import {MemoryService} from '../../platform/memory/service';
import {MemoryItem, MemoryType} from '../../platform/memory/types';
import {loadAssessConfig, saveAssessConfig} from '../../assess/config';
import {AssessBackend, AssessConfig, DEFAULT_ASSESS_CONFIG} from '../../assess/types';
import {DEFAULT_WS_CONFIG, loadWsConfig, saveWsConfig, WsConfig, WsMapping} from '../../platform/wsConfig';
import {AssessReadiness, checkAssessReadiness} from '../../assess/readiness';
import {Locale, useLocale, useT} from '../i18n';
import {IconCpu, IconBrain, IconBell, IconInfoCircle} from '@tabler/icons-react-native';
import {AppLogo} from '../components/AppLogo';
import {APP_NAME, APP_VERSION, formatAppVersion} from '../../constants/appMeta';

export type DataMode = 'loading' | 'sensor' | 'mock' | 'ble' | 'ws' | 'ws-send';
export type BleStatusLite = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';
export type WsStatusLite = 'idle' | 'connecting' | 'connected' | 'error';

type Props = {
  state: DashboardState;
  mode: DataMode;
  memory?: MemoryService;
  bleStatus?: BleStatusLite;
  wsStatus?: WsStatusLite;
  wsSendStatus?: WsStatusLite;
  wsSendInfo?: string;
  onUseSensor: () => void;
  onUseMock: () => void;
  onUseBle?: () => void;
  onUseWs?: () => void;
  onUseWsSend?: () => void;
  onCalibrate?: () => void;
  onScenario: (s: MockScenario) => void;
};

const MEMORY_TAG_KEY: Record<MemoryType, string> = {
  preference: 'memory.tag.preference',
  struggle: 'memory.tag.struggle',
  lesson: 'memory.tag.lesson',
  pattern: 'memory.tag.pattern',
  decision: 'memory.tag.decision',
  knowledge: 'memory.tag.knowledge',
  entity: 'memory.tag.entity',
};

const ASSESS_BACKEND_KEY: Record<AssessBackend, string> = {
  local: 'settings.assess.local',
  cloud: 'settings.assess.cloud',
  preset: 'settings.assess.example',
};

function AssessConfigCard(): React.JSX.Element {
  const t = useT();
  const [cfg, setCfg] = useState<AssessConfig>(DEFAULT_ASSESS_CONFIG);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
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
    setSaveState('idle');
  };
  const setCloud = (patch: Partial<AssessConfig['cloud']>) => {
    setCfg(c => ({...c, cloud: {...c.cloud, ...patch}}));
    setSaveState('idle');
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.assess.title')}</Text>
      {readiness ? (
        <Text style={styles.assessRec}>
          {t('settings.assess.recommend', {
            backend: t(ASSESS_BACKEND_KEY[readiness.recommend]),
            reason: t(readiness.recommendKey),
          })}
        </Text>
      ) : null}
      <View style={styles.rowGap}>
        <SegmentedControl
          value={cfg.backend}
          onChange={setBackend}
          options={(Object.keys(ASSESS_BACKEND_KEY) as AssessBackend[]).map(b => ({value: b, label: t(ASSESS_BACKEND_KEY[b])}))}
        />
      </View>

      {cfg.backend === 'local' && readiness ? (
        <Text style={[styles.hint, readiness.ready ? styles.assessOk : undefined]}>
          {readiness.ready
            ? t('settings.assess.localReady')
            : t('settings.assess.localNotReady', {hint: readiness.hintKey ? t(readiness.hintKey) : t('settings.assess.localNeedModel')})}
        </Text>
      ) : null}

      {cfg.backend === 'cloud' ? (
        <View style={styles.cloudForm}>
          <Text style={styles.hint}>{t('assess.cloudHint')}</Text>
          <Field
            value={cfg.cloud.baseURL}
            onChangeText={text => setCloud({baseURL: text})}
            placeholder={t('settings.assess.input.baseURL')}
            autoCapitalize="none"
          />
          <Field
            value={cfg.cloud.apiKey}
            onChangeText={text => setCloud({apiKey: text})}
            placeholder={t('settings.assess.input.apiKey')}
            autoCapitalize="none"
            secureTextEntry
          />
          <Field
            value={cfg.cloud.model}
            onChangeText={text => setCloud({model: text})}
            placeholder={t('settings.assess.input.model')}
            autoCapitalize="none"
          />
        </View>
      ) : null}

      <Button
        style={styles.saveButton}
        loading={saveState === 'saving'}
        disabled={saveState === 'saving'}
        label={
          saveState === 'saved'
            ? t('common.save') + ' ✓'
            : saveState === 'failed'
              ? t('common.save') + ' ✗'
              : t('common.save')
        }
        onPress={() => {
          setSaveState('saving');
          saveAssessConfig(cfg).then(ok => setSaveState(ok ? 'saved' : 'failed'));
        }}
      />
      <Text style={styles.hint}>{t('settings.assess.privacy')}</Text>
    </Card>
  );
}

const WS_STATUS_LABEL: Record<string, string> = {
  idle: '未连接',
  connecting: '连接中…',
  connected: '已连接',
  error: '连接失败',
};

const WS_MAPPING_LABEL: Record<WsMapping, string> = {
  'node-T': '单点·背(Node-T)',
  '3-axis': '单机·演三态',
};

const WS_MAPPING_HINT: Record<WsMapping, string> = {
  'node-T': 'pitch→胸 · roll→腰 · 颈由胸+生理曲度推算',
  '3-axis': 'pitch→颈+胸 · roll→腰',
};

type WsRole = 'receive' | 'send';

/** 保底数据源：另一台手机当姿态带（WS）。角色与连接分离，避免 iPhone 误点接收后切不回发送。 */
function WsConfigCard({
  wsRole,
  mode,
  wsStatus,
  wsSendStatus,
  wsSendInfo,
  onUseWs,
  onUseWsSend,
  onCalibrate,
}: {
  wsRole: WsRole;
  mode: DataMode;
  wsStatus?: WsStatusLite;
  wsSendStatus?: WsStatusLite;
  wsSendInfo?: string;
  onUseWs?: () => void;
  onUseWsSend?: () => void;
  onCalibrate?: () => void;
}): React.JSX.Element | null {
  const [cfg, setCfg] = useState<WsConfig>(DEFAULT_WS_CONFIG);

  useEffect(() => {
    loadWsConfig().then(setCfg);
  }, []);

  if (!onUseWs && !onUseWsSend) {
    return null;
  }

  const isSender = wsRole === 'send';
  const activeStatus = isSender ? wsSendStatus : wsStatus;
  const connected = isSender ? mode === 'ws-send' && wsSendStatus === 'connected' : mode === 'ws' && wsStatus === 'connected';

  const setUrl = (url: string) => {
    const next = {...cfg, url};
    setCfg(next);
    saveWsConfig(next);
  };
  const setMapping = (mapping: WsMapping) => {
    const next = {...cfg, mapping};
    setCfg(next);
    saveWsConfig(next);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>手机姿态带（WS · 保底）</Text>
      <Text style={styles.hint}>
        {isSender
          ? '本机当传感器：贴背、竖握，填 Mac 中转 ws 地址后点「开始发送」。原生 App 无需 ngrok。'
          : Platform.OS === 'web'
          ? 'Web 接收端：启动后自动连 ws://127.0.0.1:8787。iPhone 选「姿态发送方」推数据，在此看 Desk/Monitor。'
          : '接收方：另一台 iPhone 发来的姿态。Mac 跑 node server.mjs，填打印的 ws 地址。'}
      </Text>
      <Field
        containerStyle={styles.wsUrlField}
        value={cfg.url}
        onChangeText={setUrl}
        placeholder="ws://192.168.1.100:8787"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!isSender ? (
        <View style={[styles.rowGap, {marginTop: theme.spacing.md2}]}>
          {(Object.keys(WS_MAPPING_LABEL) as WsMapping[]).map(m => (
            <Chip key={m} selected={cfg.mapping === m} label={WS_MAPPING_LABEL[m]} onPress={() => setMapping(m)} />
          ))}
        </View>
      ) : null}
      {!isSender && cfg.mapping ? (
        <Text style={[styles.hint, {marginTop: theme.spacing.sm}]}>{WS_MAPPING_HINT[cfg.mapping]}</Text>
      ) : null}
      {isSender && onUseWsSend ? (
        <Button style={styles.saveButton} label={connected ? '重新发送' : '开始发送'} onPress={onUseWsSend} />
      ) : onUseWs ? (
        <Button style={styles.saveButton} label={connected ? '重新连接' : '连接'} onPress={onUseWs} />
      ) : null}
      <Text style={styles.hint}>
        状态：{WS_STATUS_LABEL[activeStatus ?? 'idle']}
        {isSender && activeStatus === 'error' && wsSendInfo ? `（${wsSendInfo}）` : ''}
      </Text>
      {!isSender && mode === 'ws' && wsStatus === 'connected' && onCalibrate ? (
        <Button style={styles.saveButton} label="坐直校准" onPress={onCalibrate} />
      ) : null}
    </Card>
  );
}

function LanguageCard(): React.JSX.Element {
  const {locale, setLocale} = useLocale();
  const t = useT();
  const options: Array<{key: Locale; label: string}> = [
    {key: 'en', label: t('settings.locale.en')},
    {key: 'zh', label: t('settings.locale.zh')},
  ];
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.locale.title')}</Text>
      <View style={styles.rowGap}>
        {options.map(o => (
          <Chip key={o.key} selected={locale === o.key} label={o.label} onPress={() => setLocale(o.key)} />
        ))}
      </View>
      <Text style={styles.hint}>{t('settings.locale.label')}</Text>
    </Card>
  );
}

function MemoryCard({memory}: {memory?: MemoryService}): React.JSX.Element | null {
  const t = useT();
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
        <Text style={styles.cardTitle}>{t('settings.memory.title')}</Text>
        {items.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              memory.clearAll();
              refresh();
            }}>
            <Text style={styles.memClear}>{t('settings.memory.clear')}</Text>
          </Pressable>
        ) : null}
      </View>
      {items.length === 0 ? (
        <Text style={styles.hint}>{t('settings.memory.empty')}</Text>
      ) : (
        items.map(it => (
          <View key={it.id} style={styles.memRow}>
            <Text style={styles.memTag}>{t(MEMORY_TAG_KEY[it.type])}</Text>
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
  container: {padding: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 120},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontFamily: theme.font.displaySemiBold, marginBottom: theme.spacing.lg},
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xxs,
  },
  sectionLabelText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs,
    fontFamily: theme.font.displayMedium,
    letterSpacing: 0.8,
  },
  card: {marginBottom: theme.spacing.md},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontFamily: theme.font.displayMedium, marginBottom: theme.spacing.md2},
  rowGap: {flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm},
  wrapRow: {flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: theme.spacing.md, lineHeight: 18},
  memHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md2},
  memClear: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  memRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  memTag: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    backgroundColor: '#FCEAE0',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: 6,
    overflow: 'hidden',
  },
  memText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, flex: 1, lineHeight: 18},
  memDelete: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  assessRec: {color: theme.colors.primary, fontSize: theme.font.sizeXs, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md, lineHeight: 18},
  assessOk: {color: '#3A9E1F'},
  cloudForm: {marginTop: theme.spacing.md2, gap: theme.spacing.sm2},
  wsUrlField: {marginTop: theme.spacing.md2},
  saveButton: {
    marginTop: theme.spacing.md2,
    alignSelf: 'flex-start',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  aboutBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md2,
  },
  aboutBrandText: {flex: 1},
  aboutAppName: {
    color: theme.colors.textPrimary,
    fontSize: theme.font.sizeLg,
    fontFamily: theme.font.displayMedium,
    letterSpacing: 1.2,
  },
  aboutVersionLine: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs,
    fontFamily: theme.font.body,
    marginTop: theme.spacing.xxs,
  },
  aboutLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm},
  aboutValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
});

export function SettingsScreen({
  state,
  mode,
  memory,
  bleStatus,
  wsStatus,
  wsSendStatus,
  wsSendInfo,
  onUseSensor,
  onUseMock,
  onUseBle,
  onUseWs,
  onUseWsSend,
  onCalibrate,
  onScenario,
}: Props): React.JSX.Element {
  const t = useT();
  const [mnnRefreshKey, setMnnRefreshKey] = useState(0);
  const defaultWsRole: WsRole = Platform.OS === 'web' ? 'receive' : 'send';
  const [wsRole, setWsRole] = useState<WsRole>(defaultWsRole);

  useEffect(() => {
    if (mode === 'ws-send') {
      setWsRole('send');
    } else if (mode === 'ws') {
      // iPhone 只做发送端；误连接收后仍默认展示发送 UI
      setWsRole(Platform.OS === 'ios' ? 'send' : 'receive');
    }
  }, [mode]);
  // BLE 状态 → i18n key。键名与 BleStatusLite 严格对齐；空值兜底 idle。
  const BLE_STATUS_KEY: Record<BleStatusLite, string> = {
    idle: 'settings.ble.status.idle',
    scanning: 'settings.ble.status.scanning',
    connecting: 'settings.ble.status.connecting',
    connected: 'settings.ble.status.connected',
    error: 'settings.ble.status.error',
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      {/* — 核心：模型与推理 — */}
      <View style={styles.sectionLabel}>
        <IconCpu size={14} color={theme.colors.textMuted} />
        <Text style={styles.sectionLabelText}>{t('settings.group.core')}</Text>
      </View>
      <ModelDownloadCard onModelsChanged={() => setMnnRefreshKey(k => k + 1)} />
      <BenchmarkPanel refreshKey={mnnRefreshKey} />

      {/* — 数据源 — */}
      <View style={styles.sectionLabel}>
        <IconBrain size={14} color={theme.colors.textMuted} />
        <Text style={styles.sectionLabelText}>{t('settings.group.dataSource')}</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.data.title')}</Text>
        <View style={styles.wrapRow}>
          {onUseBle ? <Chip selected={mode === 'ble'} label={t('settings.data.hardwareBand')} onPress={onUseBle} /> : null}
          {Platform.OS === 'web' && onUseWs ? (
            <Chip selected={wsRole === 'receive'} label="手机姿态带" onPress={() => setWsRole('receive')} />
          ) : null}
          {Platform.OS === 'android' && onUseWs ? (
            <Chip selected={wsRole === 'receive'} label="手机姿态带" onPress={() => setWsRole('receive')} />
          ) : null}
          {onUseWsSend ? (
            <Chip selected={wsRole === 'send'} label="姿态发送方" onPress={() => setWsRole('send')} />
          ) : null}
          <Chip selected={mode === 'sensor'} label={t('settings.data.sensor')} onPress={onUseSensor} />
          <Chip selected={mode === 'mock'} label={t('settings.data.mock')} onPress={onUseMock} />
        </View>
        {mode === 'ble' ? (
          <View>
            <Text style={styles.hint}>{t('settings.ble.hint', {status: t(BLE_STATUS_KEY[bleStatus ?? 'idle'])})}</Text>
            {bleStatus === 'connected' && onCalibrate ? (
              <Button style={styles.saveButton} label={t('settings.ble.calibrate')} onPress={onCalibrate} />
            ) : null}
          </View>
        ) : (
          <Text style={styles.hint}>
            {mode === 'ws'
              ? '手机姿态带（WS 接收）— 配置见下方卡片'
              : mode === 'ws-send'
              ? '姿态发送方 — 本机陀螺仪推送到 Mac 中转'
              : mode === 'sensor'
              ? t('settings.data.activeSensor')
              : mode === 'mock'
              ? t('settings.data.activeMock')
              : t('settings.data.loading')}
          </Text>
        )}
      </Card>

      <WsConfigCard
        wsRole={wsRole}
        mode={mode}
        wsStatus={wsStatus}
        wsSendStatus={wsSendStatus}
        wsSendInfo={wsSendInfo}
        onUseWs={onUseWs}
        onUseWsSend={onUseWsSend}
        onCalibrate={onCalibrate}
      />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.mock.title')}</Text>
        <View style={styles.wrapRow}>
          {SCENARIOS.map((s: MockScenario) => (
            <Chip
              key={s}
              selected={mode === 'mock' && state.posture === s}
              label={t(`mock.${s}` as 'mock.NORMAL')}
              onPress={() => onScenario(s)}
            />
          ))}
        </View>
        <Text style={styles.hint}>{t('settings.mock.hint')}</Text>
      </Card>

      {/* — 智能 — */}
      <View style={styles.sectionLabel}>
        <IconBell size={14} color={theme.colors.textMuted} />
        <Text style={styles.sectionLabelText}>{t('settings.group.intelligence')}</Text>
      </View>
      <AssessConfigCard />
      <MemoryCard memory={memory} />

      {/* — 通用 — */}
      <View style={styles.sectionLabel}>
        <IconInfoCircle size={14} color={theme.colors.textMuted} />
        <Text style={styles.sectionLabelText}>{t('settings.group.general')}</Text>
      </View>
      <LanguageCard />

      <Card style={styles.card}>
        <View style={styles.aboutBrand}>
          <AppLogo size={48} />
          <View style={styles.aboutBrandText}>
            <Text style={styles.aboutAppName}>{APP_NAME}</Text>
            <Text style={styles.aboutVersionLine}>{formatAppVersion()}</Text>
          </View>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>{t('settings.about.version')}</Text>
          <Text style={styles.aboutValue}>{APP_VERSION}</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>{t('settings.about.model')}</Text>
          <Text style={styles.aboutValue}>Qwen2.5-0.5B</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>{t('settings.about.framework')}</Text>
          <Text style={styles.aboutValue}>MNN + SME2</Text>
        </View>
        <Text style={[styles.hint, {marginTop: theme.spacing.md2}]}>{t('settings.about.body')}</Text>
      </Card>
    </ScrollView>
  );
}
