/**
 * @file BenchmarkScreen.tsx
 * @description 模型基准测试：可编辑 Prompt、输出展示、推理指标（录像证真端侧模型）。
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {NativeModules, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, theme} from '../theme';
import {Card} from '../primitives/Card';
import {useT} from '../i18n';

type Metrics = {
  ttftMs?: number;
  prefillMs?: number;
  decodeMs?: number;
  tokensGenerated?: number;
  decodeTps?: number;
  backend?: string;
};
type CpuInfo = {
  sme2Hw?: boolean;
  libSme2?: boolean;
  i8mm?: boolean;
  dot?: boolean;
  fp16?: boolean;
  backend?: string;
  readiness?: string;
};
type Status = {
  nativeLibLoaded?: boolean;
  modelLoaded?: boolean;
  modelDir?: string;
  activeModelId?: string;
  configExists?: boolean;
  loadError?: string | null;
  cpu?: CpuInfo;
};
type InferResult = {rawOutput?: string; inferenceMs?: number; metrics?: Metrics};
type BenchRun = {run?: number; label?: string; inferenceMs?: number; metrics?: Metrics; rawOutput?: string};
type BenchResult = {
  runs?: BenchRun[];
  summary?: {avgDecodeTps?: number; backend?: string; readiness?: string; sme2Hw?: boolean; libSme2?: boolean};
};

type CatuneMnnModule = {
  getStatus: () => Promise<Status>;
  inferText: (prompt: string) => Promise<InferResult>;
  runBenchmark: (prompt: string) => Promise<BenchResult>;
};

type MetricScope = 'idle' | 'infer' | 'bench';

type T = (key: string, vars?: Record<string, string | number>) => string;

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;
const DEFAULT_PROMPT = '请用一句不超过30字、有温度的中文提醒我坐直，语气温和，不要医疗诊断。';

const PREVIEW_STATUS: Status = {
  nativeLibLoaded: false,
  modelLoaded: false,
  configExists: false,
  activeModelId: 'qwen2.5-0.5b（预览）',
  modelDir: 'Expo Go 无原生 MNN',
  cpu: {
    sme2Hw: false,
    libSme2: false,
    backend: '—',
    readiness: 'Expo Go 预览',
  },
};

type BenchmarkPanelProps = {refreshKey?: number};

const bad = '#C20A0A';

/** 毫秒：小值保留 1 位小数，避免 TTFT 被四舍五入成 0。 */
function formatDurationMs(ms: number | null | undefined, t: T): string {
  if (ms == null || Number.isNaN(ms)) {
    return '—';
  }
  if (ms > 0 && ms < 1) {
    return t('benchmark.duration.short');
  }
  if (ms < 100) {
    return t('benchmark.duration.fmt', {ms: ms.toFixed(1)});
  }
  return t('benchmark.duration.fmt', {ms: Math.round(ms)});
}

function formatTps(tps: number | null | undefined, t: T): string {
  if (tps == null || Number.isNaN(tps)) {
    return '—';
  }
  return t('benchmark.tps.fmt', {n: tps.toFixed(2)});
}

function formatRunDetail(run: BenchRun, t: T): string {
  const m = run.metrics;
  return t('benchmark.run.fmt', {
    tps: formatTps(m?.decodeTps, t),
    tokens: m?.tokensGenerated ?? '—',
    total: formatDurationMs(run.inferenceMs, t),
    prefill: formatDurationMs(m?.prefillMs, t),
    decode: formatDurationMs(m?.decodeMs, t),
  });
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.md},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  subtitle: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 6, lineHeight: 17},
  previewBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewBannerText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, lineHeight: 17},
  body: {marginTop: 12},
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizeXs,
    lineHeight: 16,
    marginBottom: 8,
  },
  promptInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: theme.font.sizeSm,
    lineHeight: 20,
    backgroundColor: theme.colors.surface,
    textAlignVertical: 'top',
  },
  inputPreview: {backgroundColor: '#FAFAFA'},
  ioBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: '#FAFAFA',
    padding: 12,
    minHeight: 88,
  },
  ioBoxPreview: {opacity: 0.85},
  outputText: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, lineHeight: 22},
  outputPlaceholder: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, lineHeight: 20},
  metricGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  metricTile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
  },
  metricLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  metricValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginTop: 4},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, flexShrink: 0},
  infoValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    flex: 1,
    textAlign: 'right',
  },
  btnRow: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: 10},
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  btnPrimary: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  btnDisabled: {opacity: 0.5},
  btnText: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  btnTextPrimary: {color: theme.colors.primary},
  errorText: {color: bad, fontSize: theme.font.sizeXs, marginTop: 8, lineHeight: 17},
});

function MetricTile({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export function BenchmarkPanel({refreshKey = 0}: BenchmarkPanelProps): React.JSX.Element {
  const t = useT();
  const nativeReady = Boolean(CatuneMnn);
  const previewMode = !nativeReady;

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<Status | null>(previewMode ? PREVIEW_STATUS : null);
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [metricScope, setMetricScope] = useState<MetricScope>('idle');
  const [busy, setBusy] = useState<'' | 'status' | 'infer' | 'bench'>('');
  const [error, setError] = useState<string | null>(null);

  const yesNo = useCallback(
    (v?: boolean) => (v === undefined ? '—' : v ? t('common.yes') : t('common.no')),
    [t],
  );

  const refresh = useCallback(async () => {
    if (!CatuneMnn) {
      setStatus(PREVIEW_STATUS);
      return;
    }
    setBusy('status');
    setError(null);
    try {
      setStatus(await CatuneMnn.getStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const trimmedPrompt = prompt.trim();
  const actionsDisabled = previewMode || busy !== '';

  const lastBenchTimed = useMemo(
    () => [...(bench?.runs ?? [])].reverse().find(r => r.label === 'timed'),
    [bench],
  );

  const runInfer = async () => {
    if (previewMode || !CatuneMnn || !trimmedPrompt) {
      return;
    }
    setBusy('infer');
    setError(null);
    setBench(null);
    setMetricScope('infer');
    try {
      const result = await CatuneMnn.inferText(trimmedPrompt);
      setOutput(result.rawOutput ?? '');
      setMetrics(result.metrics ?? null);
      setInferenceMs(result.inferenceMs ?? null);
      setStatus(await CatuneMnn.getStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const runBench = async () => {
    if (previewMode || !CatuneMnn || !trimmedPrompt) {
      return;
    }
    setBusy('bench');
    setError(null);
    setMetricScope('bench');
    try {
      const result = await CatuneMnn.runBenchmark(trimmedPrompt);
      setBench(result);
      const lastTimed = [...(result.runs ?? [])].reverse().find(r => r.label === 'timed');
      if (lastTimed?.rawOutput) {
        setOutput(lastTimed.rawOutput);
      }
      if (lastTimed?.metrics) {
        setMetrics(lastTimed.metrics);
        setInferenceMs(lastTimed.inferenceMs ?? null);
      }
      setStatus(await CatuneMnn.getStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const cpu = status?.cpu;
  const backend = metrics?.backend ?? bench?.summary?.backend ?? cpu?.backend ?? '—';
  const timedRunCount = (bench?.runs ?? []).filter(r => r.label === 'timed').length;
  const metricSectionTitle =
    metricScope === 'bench' && lastBenchTimed?.run != null
      ? t('benchmark.section.benchTitle', {n: lastBenchTimed.run})
      : metricScope === 'infer'
        ? t('benchmark.section.inferTitle')
        : t('benchmark.section.defaultTitle');

  const metricSectionHint =
    metricScope === 'bench'
      ? t('benchmark.section.benchHint', {n: lastBenchTimed?.run ?? '?'})
      : metricScope === 'infer'
        ? t('benchmark.section.inferHint')
        : null;

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{t('benchmark.title')}</Text>
      <Text style={styles.subtitle}>{t('benchmark.subtitle')}</Text>

      {previewMode ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>{t('benchmark.banner')}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>{t('benchmark.promptLabel')}</Text>
        <TextInput
          style={[styles.promptInput, previewMode && styles.inputPreview]}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholder={t('benchmark.promptPlaceholder')}
          placeholderTextColor={colors.textMuted}
          editable={busy === ''}
        />

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, actionsDisabled && styles.btnDisabled]} disabled={actionsDisabled} onPress={refresh}>
            <Text style={styles.btnText}>{busy === 'status' ? t('benchmark.busy.status') : t('benchmark.action.refresh')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (actionsDisabled || !trimmedPrompt) && styles.btnDisabled]}
            disabled={actionsDisabled || !trimmedPrompt}
            onPress={runInfer}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>{busy === 'infer' ? t('benchmark.busy.infer') : t('benchmark.action.infer')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (actionsDisabled || !trimmedPrompt) && styles.btnDisabled]}
            disabled={actionsDisabled || !trimmedPrompt}
            onPress={runBench}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>{busy === 'bench' ? t('benchmark.busy.bench') : t('benchmark.action.bench')}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('benchmark.outputLabel')}</Text>
        <View style={[styles.ioBox, previewMode && styles.ioBoxPreview]}>
          <Text style={output ? styles.outputText : styles.outputPlaceholder}>
            {previewMode
              ? t('benchmark.bannerOutput')
              : output || t('benchmark.bannerCta')}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{metricSectionTitle}</Text>
        {metricSectionHint ? <Text style={styles.sectionHint}>{metricSectionHint}</Text> : null}
        <View style={styles.metricGrid}>
          <MetricTile label={t('benchmark.metric.ttft')} value={formatDurationMs(metrics?.ttftMs, t)} />
          <MetricTile label={t('benchmark.metric.prefill')} value={formatDurationMs(metrics?.prefillMs, t)} />
          <MetricTile label={t('benchmark.metric.decode')} value={formatDurationMs(metrics?.decodeMs, t)} />
          <MetricTile label={t('benchmark.metric.total')} value={formatDurationMs(inferenceMs, t)} />
          <MetricTile label={t('benchmark.metric.tps')} value={formatTps(metrics?.decodeTps, t)} />
          <MetricTile label={t('benchmark.metric.tokens')} value={metrics?.tokensGenerated != null ? String(metrics.tokensGenerated) : '—'} />
          <MetricTile label={t('benchmark.metric.backend')} value={backend} />
          <MetricTile label={t('benchmark.metric.modelLoaded')} value={yesNo(status?.modelLoaded)} />
        </View>

        {metricScope === 'bench' && bench?.summary?.avgDecodeTps != null ? (
          <>
            <Text style={styles.sectionLabel}>{t('benchmark.summary.title')}</Text>
            <InfoRow
              label={t('benchmark.summary.avgTps', {n: timedRunCount})}
              value={formatTps(bench.summary.avgDecodeTps, t)}
            />
            <InfoRow label={t('benchmark.summary.scope')} value={t('benchmark.summary.scopeHint')} />
          </>
        ) : null}

        {bench?.runs?.length ? (
          <>
            <Text style={styles.sectionLabel}>{t('benchmark.runs.title')}</Text>
            {bench.runs.map((run, index) => (
              <InfoRow
                key={index}
                label={t('benchmark.run.labelFmt', {n: run.run ?? '?', label: run.label ?? ''})}
                value={formatRunDetail(run, t)}
              />
            ))}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>{t('benchmark.info.title')}</Text>
        <InfoRow label={t('benchmark.info.activeModel')} value={status?.activeModelId ?? '—'} />
        <InfoRow label={t('benchmark.info.modelDir')} value={status?.modelDir ?? '—'} />
        <InfoRow label={t('benchmark.info.sme2')} value={`${yesNo(cpu?.sme2Hw)} / ${yesNo(cpu?.libSme2)}`} />
        <InfoRow label={t('benchmark.info.readiness')} value={cpu?.readiness ?? '—'} />
        {status?.loadError ? <Text style={styles.errorText}>{status.loadError}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </Card>
  );
}