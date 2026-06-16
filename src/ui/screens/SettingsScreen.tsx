/**
 * @file SettingsScreen.tsx
 * @description 设置屏（= web SettingsPage 的 RN 版）：数据源切换（传感器/模拟）+ F7 演示控制台 + Android MNN Debug。
 *
 * [WHO] 导出 `SettingsScreen`
 * [FROM] 依赖 `react`、`react-native`、`../theme`、`../primitives/Card`、`./BenchmarkScreen`、`../../posture/mock`、`../../posture/types`、Android `NativeModules.CatuneMnn`
 * [TO] 被 `AppShell` 在 settings tab 渲染
 * [HERE] src/ui/screens/SettingsScreen.tsx · 设置/演示控制
 */
import React, {useCallback, useEffect, useState} from 'react';
import {NativeModules, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {ModelDownloadCard} from '../components/ModelDownloadCard';
import {BenchmarkPanel} from './BenchmarkScreen';
import {MockScenario, SCENARIOS} from '../../posture/mock';
import {DashboardState} from '../../posture/types';

export type DataMode = 'loading' | 'sensor' | 'mock';

type Props = {
  state: DashboardState;
  mode: DataMode;
  onUseSensor: () => void;
  onUseMock: () => void;
  onScenario: (s: MockScenario) => void;
};

type CatuneMnnInferResult = {
  rawOutput?: string;
  inferenceMs?: number;
  metrics?: {
    ttftMs?: number;
    prefillMs?: number;
    decodeMs?: number;
    tokensGenerated?: number;
    decodeTps?: number;
    backend?: string;
  };
};

type CatuneMnnCpuInfo = {
  probeOk?: boolean;
  fp16?: boolean;
  dot?: boolean;
  i8mm?: boolean;
  sve2?: boolean;
  sme2Hw?: boolean;
  libSme2?: boolean;
  backend?: string;
  readiness?: string;
};

type CatuneMnnStatus = {
  nativeLibLoaded?: boolean;
  modelDirExists?: boolean;
  configExists?: boolean;
  modelLoaded?: boolean;
  modelDir?: string;
  activeModelId?: string;
  loadError?: string | null;
  cpu?: CatuneMnnCpuInfo;
};

type CatuneMnnBenchRun = {
  run?: number;
  label?: string;
  inferenceMs?: number;
  rawOutput?: string;
  metrics?: CatuneMnnInferResult['metrics'];
};

type CatuneMnnBenchResult = {
  runs?: CatuneMnnBenchRun[];
  summary?: {
    avgDecodeTps?: number;
    backend?: string;
    readiness?: string;
    sme2Hw?: boolean;
    libSme2?: boolean;
  };
};

type CatuneMnnModule = {
  getStatus: () => Promise<CatuneMnnStatus>;
  inferText: (prompt: string) => Promise<CatuneMnnInferResult>;
  runBenchmark: (prompt: string) => Promise<CatuneMnnBenchResult>;
  releaseModel?: () => Promise<boolean>;
};

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;
const MNN_TEST_PROMPT = '请用一句不超过30字的中文提醒我坐直，语气温和，不要医疗诊断。';

function Pill({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BoolValue({value}: {value?: boolean}): React.JSX.Element {
  const label = value === undefined ? 'unknown' : value ? 'true' : 'false';
  const color = value ? '#3A9E1F' : value === false ? '#C20A0A' : theme.colors.textMuted;
  return <Text style={[styles.valueText, {color}]}>{label}</Text>;
}

function StatusRow({label, children}: {label: string; children: React.ReactNode}): React.JSX.Element {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={styles.statusValue}>{children}</View>
    </View>
  );
}

function DebugButton({label, disabled, onPress}: {label: string; disabled?: boolean; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable style={[styles.debugButton, disabled && styles.debugButtonDisabled]} disabled={disabled} onPress={onPress}>
      <Text style={[styles.debugButtonText, disabled && styles.debugButtonTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

function MnnDebugCard({refreshKey}: {refreshKey: number}): React.JSX.Element {
  const [status, setStatus] = useState<CatuneMnnStatus | null>(null);
  const [result, setResult] = useState<CatuneMnnInferResult | null>(null);
  const [bench, setBench] = useState<CatuneMnnBenchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const available = Boolean(CatuneMnn);
  const cpu = status?.cpu;
  const activeBackend = result?.metrics?.backend ?? bench?.summary?.backend ?? cpu?.backend ?? 'unknown';

  const readStatus = useCallback(async () => {
    if (!CatuneMnn) {
      setError('CatuneMnn native module unavailable');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await CatuneMnn.getStatus();
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const runInfer = useCallback(async () => {
    if (!CatuneMnn) {
      setError('CatuneMnn native module unavailable');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setBench(null);
    try {
      const next = await CatuneMnn.inferText(MNN_TEST_PROMPT);
      setResult(next);
      const nextStatus = await CatuneMnn.getStatus();
      setStatus(nextStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const runBench = useCallback(async () => {
    if (!CatuneMnn) {
      setError('CatuneMnn native module unavailable');
      return;
    }
    setBusy(true);
    setError(null);
    setBench(null);
    try {
      const next = await CatuneMnn.runBenchmark(MNN_TEST_PROMPT);
      setBench(next);
      const nextStatus = await CatuneMnn.getStatus();
      setStatus(nextStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    readStatus();
  }, [readStatus, refreshKey]);

  const metrics = result?.metrics;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitleNoMargin}>MNN DEBUG</Text>
        <View style={[styles.smallDot, {backgroundColor: available ? '#3A9E1F' : '#C20A0A'}]} />
      </View>

      <View style={styles.statusBlock}>
        <StatusRow label="module">
          <BoolValue value={available} />
        </StatusRow>
        <StatusRow label="native">
          <BoolValue value={status?.nativeLibLoaded} />
        </StatusRow>
        <StatusRow label="model dir">
          <BoolValue value={status?.modelDirExists} />
        </StatusRow>
        <StatusRow label="config">
          <BoolValue value={status?.configExists} />
        </StatusRow>
        <StatusRow label="loaded">
          <BoolValue value={status?.modelLoaded} />
        </StatusRow>
        <StatusRow label="active model">
          <Text style={styles.valueText}>{status?.activeModelId ?? 'unknown'}</Text>
        </StatusRow>
        <StatusRow label="hw sme2">
          <BoolValue value={cpu?.sme2Hw} />
        </StatusRow>
        <StatusRow label="lib sme2">
          <BoolValue value={cpu?.libSme2} />
        </StatusRow>
        <StatusRow label="SME2 verdict">
          <Text style={styles.valueText} numberOfLines={2}>{cpu?.readiness ?? 'unknown'}</Text>
        </StatusRow>
        <StatusRow label="backend">
          <Text style={styles.valueText}>{activeBackend}</Text>
        </StatusRow>
        <StatusRow label="ttft / tps">
          <Text style={styles.valueText}>
            {metrics ? `${Math.round(metrics.ttftMs ?? 0)}ms / ${(metrics.decodeTps ?? 0).toFixed(2)}` : 'not run'}
          </Text>
        </StatusRow>
      </View>

      {status?.modelDir ? <Text style={styles.monoHint} numberOfLines={2}>{status.modelDir}</Text> : null}
      {status?.loadError ? <Text style={styles.errorText} numberOfLines={3}>{status.loadError}</Text> : null}
      {error ? <Text style={styles.errorText} numberOfLines={3}>{error}</Text> : null}
      {result?.rawOutput ? <Text style={styles.rawOutput} numberOfLines={4}>{result.rawOutput}</Text> : null}
      {bench?.summary ? (
        <Text style={styles.rawOutput} numberOfLines={5}>
          {`BENCH avg tps=${(bench.summary.avgDecodeTps ?? 0).toFixed(2)} backend=${bench.summary.backend ?? '?'} readiness=${bench.summary.readiness ?? '?'}`}
          {'\n'}
          {bench.runs
            ?.filter(r => r.label === 'timed')
            .map(r => `#${r.run} ${Math.round(r.inferenceMs ?? 0)}ms tps=${(r.metrics?.decodeTps ?? 0).toFixed(2)}`)
            .join('\n')}
        </Text>
      ) : null}

      <View style={styles.rowGap}>
        <DebugButton label={busy ? '...' : 'REFRESH'} disabled={busy} onPress={readStatus} />
        <DebugButton label="INFER TEXT" disabled={busy || !available} onPress={runInfer} />
      </View>
      <View style={styles.rowGap}>
        <DebugButton label="BENCH x2" disabled={busy || !available} onPress={runBench} />
      </View>
      <Text style={styles.hint}>
        SME2：hw sme2=芯片能力，lib sme2=APK 内 libMNN 是否含 SME2 编译；两者均为 true 且 backend=SME2 才算走 SME2 加速。真机装此 APK 后点 BENCH x2 可录 demo。
      </Text>
    </Card>
  );
}

export function SettingsScreen({state, mode, onUseSensor, onUseMock, onScenario}: Props): React.JSX.Element {
  const [mnnRefreshKey, setMnnRefreshKey] = useState(0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>设置</Text>

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
        <Text style={styles.cardTitle}>F7 演示控制台</Text>
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

      <ModelDownloadCard onModelsChanged={() => setMnnRefreshKey(k => k + 1)} />

      <BenchmarkPanel refreshKey={mnnRefreshKey} />

      <MnnDebugCard refreshKey={mnnRefreshKey} />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>关于</Text>
        <Text style={styles.hint}>Catune · 不驼背坐姿助手。健康管理辅助，非医疗诊断。</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.background},
  container: {padding: theme.spacing.lg, paddingTop: 56, paddingBottom: 120},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightHeavy, marginBottom: 20},
  card: {marginBottom: theme.spacing.md},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginBottom: 12},
  cardTitleNoMargin: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  cardHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  rowGap: {flexDirection: 'row', gap: theme.spacing.sm},
  wrapRow: {flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 18},
  monoHint: {color: theme.colors.textMuted, fontSize: 10, marginTop: 10, lineHeight: 15},
  errorText: {color: '#C20A0A', fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 17},
  rawOutput: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizeXs,
    marginTop: 10,
    lineHeight: 17,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  smallDot: {width: 8, height: 8, borderRadius: 4},
  statusBlock: {borderTopWidth: 1, borderTopColor: theme.colors.border},
  statusRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs},
  statusValue: {alignItems: 'flex-end', flex: 1, marginLeft: theme.spacing.md},
  valueText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  debugButton: {
    marginTop: theme.spacing.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#FCEAE0',
  },
  debugButtonDisabled: {borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted},
  debugButtonText: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  debugButtonTextDisabled: {color: theme.colors.textMuted},
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
});
