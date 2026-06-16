/**
 * @file BenchmarkScreen.tsx
 * @description 端侧推理「实测/证真」界面（初赛录像用）：展示活跃模型、本地路径、CPU/后端能力(SME2/NEON)、单次推理与基准测试的 TTFT/TPS/tokens 真实指标 + 模型原始输出。
 *   复用现有原生 `CatuneMnn.getStatus()/inferText()/runBenchmark()`，不需改原生。建议演示时开飞行模式以证明纯本地。
 *
 * [WHO] 导出 `BenchmarkScreen`
 * [FROM] 依赖 `react`、`react-native`(NativeModules)、`../theme`、`../primitives/Card`
 * [TO] 由你在 UI 改造里挂到一个 Tab / 入口（自包含，不依赖 AppShell 改动）
 * [HERE] src/ui/screens/BenchmarkScreen.tsx · 端侧推理实测界面
 */
import React, {useCallback, useEffect, useState} from 'react';
import {NativeModules, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';

type Metrics = {ttftMs?: number; prefillMs?: number; decodeMs?: number; tokensGenerated?: number; decodeTps?: number; backend?: string};
type CpuInfo = {sme2Hw?: boolean; libSme2?: boolean; i8mm?: boolean; dot?: boolean; fp16?: boolean; backend?: string; readiness?: string};
type Status = {nativeLibLoaded?: boolean; modelLoaded?: boolean; modelDir?: string; activeModelId?: string; configExists?: boolean; cpu?: CpuInfo};
type InferResult = {rawOutput?: string; inferenceMs?: number; metrics?: Metrics};
type BenchRun = {run?: number; label?: string; inferenceMs?: number; metrics?: Metrics; rawOutput?: string};
type BenchResult = {runs?: BenchRun[]; summary?: {avgDecodeTps?: number; backend?: string; readiness?: string; sme2Hw?: boolean; libSme2?: boolean}};

type CatuneMnnModule = {
  getStatus: () => Promise<Status>;
  inferText: (prompt: string) => Promise<InferResult>;
  runBenchmark: (prompt: string) => Promise<BenchResult>;
};

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;
const PROMPT = '请用一句不超过30字、有温度的中文提醒我坐直，语气温和，不要医疗诊断。';
type BenchmarkPanelProps = {refreshKey?: number};

function Big({label, value, unit, color}: {label: string; value: string; unit?: string; color?: string}): React.JSX.Element {
  return (
    <Card style={styles.bigCard}>
      <Text style={styles.bigLabel}>{label}</Text>
      <Text style={[styles.bigValue, color ? {color} : null]}>
        {value}
        {unit ? <Text style={styles.bigUnit}> {unit}</Text> : null}
      </Text>
    </Card>
  );
}

function Row({label, value, color}: {label: string; value: string; color?: string}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? {color} : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const ok = '#3A9E1F';
const bad = '#C20A0A';
const boolColor = (v?: boolean) => (v ? ok : v === false ? bad : theme.colors.textMuted);
const boolText = (v?: boolean) => (v === undefined ? '—' : v ? 'yes' : 'no');

export function BenchmarkPanel({refreshKey = 0}: BenchmarkPanelProps): React.JSX.Element {
  const available = Boolean(CatuneMnn);
  const [status, setStatus] = useState<Status | null>(null);
  const [single, setSingle] = useState<InferResult | null>(null);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [busy, setBusy] = useState<'' | 'status' | 'infer' | 'bench'>('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!CatuneMnn) {
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

  const runInfer = async () => {
    if (!CatuneMnn) {
      return;
    }
    setBusy('infer');
    setError(null);
    setSingle(null);
    try {
      setSingle(await CatuneMnn.inferText(PROMPT));
      setStatus(await CatuneMnn.getStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const runBench = async () => {
    if (!CatuneMnn) {
      return;
    }
    setBusy('bench');
    setError(null);
    setBench(null);
    try {
      setBench(await CatuneMnn.runBenchmark(PROMPT));
      setStatus(await CatuneMnn.getStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const cpu = status?.cpu;
  const m = single?.metrics;
  const sum = bench?.summary;
  const tps = sum?.avgDecodeTps ?? m?.decodeTps;
  const backend = sum?.backend ?? m?.backend ?? cpu?.backend ?? '—';
  const ttft = m?.ttftMs;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>模型基准测试</Text>
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>录像建议打开飞行模式：本页只调用本地 CatuneMnn，展示本地路径和端侧指标。</Text>
      </View>

      {!available ? (
        <Card style={styles.card}>
          <Text style={styles.hint}>CatuneMnn 原生模块不可用（仅 Android arm64 真机/模拟器构建后可用）。</Text>
        </Card>
      ) : (
        <View>
          {/* 大指标 */}
          <View style={styles.bigRow}>
            <Big label="DECODE TPS" value={tps != null ? tps.toFixed(1) : '—'} unit="tok/s" color={theme.colors.primary} />
            <Big label="TTFT" value={ttft != null ? Math.round(ttft).toString() : '—'} unit="ms" />
            <Big label="BACKEND" value={backend} color={sum?.sme2Hw || cpu?.sme2Hw ? ok : theme.colors.textPrimary} />
          </View>

          {/* 模型 / 真实性 */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>模型与设备</Text>
            <Row label="active model" value={status?.activeModelId ?? '—'} />
            <Row label="model loaded" value={boolText(status?.modelLoaded)} color={boolColor(status?.modelLoaded)} />
            <Row label="config exists" value={boolText(status?.configExists)} color={boolColor(status?.configExists)} />
            <Row label="本地路径" value={status?.modelDir ?? '—'} />
            <Row label="hw sme2" value={boolText(cpu?.sme2Hw)} color={boolColor(cpu?.sme2Hw)} />
            <Row label="lib sme2" value={boolText(cpu?.libSme2)} color={boolColor(cpu?.libSme2)} />
            <Row label="i8mm / dot / fp16" value={`${boolText(cpu?.i8mm)} / ${boolText(cpu?.dot)} / ${boolText(cpu?.fp16)}`} />
            <Row label="SME2 判定" value={cpu?.readiness ?? '—'} />
          </Card>

          {error ? (
            <Card style={styles.card}>
              <Text style={[styles.hint, {color: bad}]} numberOfLines={4}>
                {error}
              </Text>
            </Card>
          ) : null}

          {/* 单次输出（证明真实生成） */}
          {single?.rawOutput ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>模型输出（单次）</Text>
              <Text style={styles.output}>{single.rawOutput}</Text>
              <Text style={styles.hint}>
                {single.metrics?.tokensGenerated ?? '—'} tokens · {Math.round(single.inferenceMs ?? 0)}ms · {single.metrics?.backend ?? '—'}
              </Text>
            </Card>
          ) : null}

          {/* 基准多轮 */}
          {bench?.runs?.length ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>基准测试（warmup + timed）</Text>
              {bench.runs.map((r, i) => (
                <Row
                  key={i}
                  label={`run ${r.run} · ${r.label}`}
                  value={`${(r.metrics?.decodeTps ?? 0).toFixed(1)} tok/s · ${r.metrics?.tokensGenerated ?? '—'} tok · ${Math.round(r.inferenceMs ?? 0)}ms`}
                />
              ))}
              <Row label="平均 TPS" value={`${(sum?.avgDecodeTps ?? 0).toFixed(2)} tok/s`} color={theme.colors.primary} />
            </Card>
          ) : null}

          {/* 操作 */}
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, busy !== '' && styles.btnDisabled]} disabled={busy !== ''} onPress={refresh}>
              <Text style={styles.btnText}>{busy === 'status' ? '…' : '刷新状态'}</Text>
            </Pressable>
            <Pressable style={[styles.btn, busy !== '' && styles.btnDisabled]} disabled={busy !== ''} onPress={runInfer}>
              <Text style={styles.btnText}>{busy === 'infer' ? '推理中…' : '单次推理'}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary, busy !== '' && styles.btnDisabled]} disabled={busy !== ''} onPress={runBench}>
              <Text style={[styles.btnText, styles.btnTextPrimary]}>{busy === 'bench' ? '跑分中…' : '基准测试'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function BenchmarkScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <BenchmarkPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.background},
  container: {padding: theme.spacing.md, paddingTop: 48, paddingBottom: 120, gap: theme.spacing.sm},
  panel: {gap: theme.spacing.sm},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightHeavy, paddingHorizontal: 4},
  offlineBanner: {backgroundColor: '#FCEAE0', borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primary, padding: 10, marginBottom: theme.spacing.xs},
  offlineText: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold, textAlign: 'center'},
  bigRow: {flexDirection: 'row', gap: theme.spacing.sm},
  bigCard: {flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md},
  bigLabel: {color: theme.colors.textMuted, fontSize: 9, fontWeight: theme.font.weightBold, letterSpacing: 1},
  bigValue: {color: theme.colors.textPrimary, fontSize: 22, fontWeight: theme.font.weightHeavy, marginTop: 4},
  bigUnit: {fontSize: 11, fontWeight: theme.font.weightBold, color: theme.colors.textMuted},
  card: {marginTop: theme.spacing.sm},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginBottom: 10},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, gap: 12},
  rowLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, flexShrink: 0},
  rowValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold, flex: 1, textAlign: 'right'},
  output: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, lineHeight: 22},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 8, lineHeight: 17},
  btnRow: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md},
  btn: {flex: 1, paddingVertical: 11, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center'},
  btnPrimary: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  btnDisabled: {opacity: 0.5},
  btnText: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnTextPrimary: {color: theme.colors.primary},
});
