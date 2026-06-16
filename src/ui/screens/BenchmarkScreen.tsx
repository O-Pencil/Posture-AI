/**
 * @file BenchmarkScreen.tsx
 * @description 模型基准测试：可编辑 Prompt、输出展示、推理指标（录像证真端侧模型）。
 */
import React, {useCallback, useEffect, useState} from 'react';
import {NativeModules, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, theme} from '../theme';
import {Card} from '../primitives/Card';

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
const yesNo = (v?: boolean) => (v === undefined ? '—' : v ? '是' : '否');

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
  metricLabel: {color: theme.colors.textMuted, fontSize: 9, fontWeight: theme.font.weightBold},
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
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function BenchmarkPanel({refreshKey = 0}: BenchmarkPanelProps): React.JSX.Element {
  const nativeReady = Boolean(CatuneMnn);
  const previewMode = !nativeReady;

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<Status | null>(previewMode ? PREVIEW_STATUS : null);
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [busy, setBusy] = useState<'' | 'status' | 'infer' | 'bench'>('');
  const [error, setError] = useState<string | null>(null);

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

  const runInfer = async () => {
    if (previewMode || !CatuneMnn || !trimmedPrompt) {
      return;
    }
    setBusy('infer');
    setError(null);
    setBench(null);
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
  const tps = bench?.summary?.avgDecodeTps ?? metrics?.decodeTps;

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>模型基准测试</Text>
      <Text style={styles.subtitle}>用于检测当前端侧模型的加载状态、推理输出与性能指标。</Text>

      {previewMode ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>Expo Go 预览模式：可查看布局；推理/输出需安装 arm64 原生 APK。</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Prompt 输入</Text>
        <TextInput
          style={[styles.promptInput, previewMode && styles.inputPreview]}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholder="输入要发给端侧模型的 Prompt"
          placeholderTextColor={colors.textMuted}
          editable={busy === ''}
        />

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, actionsDisabled && styles.btnDisabled]} disabled={actionsDisabled} onPress={refresh}>
            <Text style={styles.btnText}>{busy === 'status' ? '…' : '刷新'}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (actionsDisabled || !trimmedPrompt) && styles.btnDisabled]}
            disabled={actionsDisabled || !trimmedPrompt}
            onPress={runInfer}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>{busy === 'infer' ? '推理中…' : '单次推理'}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (actionsDisabled || !trimmedPrompt) && styles.btnDisabled]}
            disabled={actionsDisabled || !trimmedPrompt}
            onPress={runBench}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>{busy === 'bench' ? '跑分中…' : '基准 x2'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>模型输出</Text>
        <View style={[styles.ioBox, previewMode && styles.ioBoxPreview]}>
          <Text style={output ? styles.outputText : styles.outputPlaceholder}>
            {previewMode
              ? '（Expo Go 预览）安装原生 APK 并下载模型后，推理结果将显示在此'
              : output || '点击「单次推理」或「基准 x2」后在此显示端侧模型原始输出'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>推理指标</Text>
        <View style={styles.metricGrid}>
          <MetricTile label="TTFT" value={metrics?.ttftMs != null ? `${Math.round(metrics.ttftMs)} ms` : '—'} />
          <MetricTile label="TPS" value={tps != null ? tps.toFixed(2) : '—'} />
          <MetricTile label="Tokens" value={metrics?.tokensGenerated != null ? String(metrics.tokensGenerated) : '—'} />
          <MetricTile label="Backend" value={backend} />
          <MetricTile label="总耗时" value={inferenceMs != null ? `${Math.round(inferenceMs)} ms` : '—'} />
          <MetricTile label="模型已加载" value={yesNo(status?.modelLoaded)} />
        </View>

        {bench?.runs?.length ? (
          <>
            <Text style={styles.sectionLabel}>基准轮次</Text>
            {bench.runs.map((run, index) => (
              <InfoRow
                key={index}
                label={`#${run.run} ${run.label ?? ''}`}
                value={`${(run.metrics?.decodeTps ?? 0).toFixed(2)} tok/s · ${run.metrics?.tokensGenerated ?? '—'} tok · ${Math.round(run.inferenceMs ?? 0)} ms`}
              />
            ))}
            <InfoRow label="平均 TPS" value={`${(bench.summary?.avgDecodeTps ?? 0).toFixed(2)} tok/s`} />
          </>
        ) : null}

        <Text style={styles.sectionLabel}>设备 / 模型</Text>
        <InfoRow label="当前模型" value={status?.activeModelId ?? '—'} />
        <InfoRow label="本地路径" value={status?.modelDir ?? '—'} />
        <InfoRow label="hw sme2 / lib sme2" value={`${yesNo(cpu?.sme2Hw)} / ${yesNo(cpu?.libSme2)}`} />
        <InfoRow label="SME2 判定" value={cpu?.readiness ?? '—'} />
        {status?.loadError ? <Text style={styles.errorText}>{status.loadError}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </Card>
  );
}
