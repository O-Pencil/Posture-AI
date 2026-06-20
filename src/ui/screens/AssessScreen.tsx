/**
 * @file AssessScreen.tsx
 * @description AI 体态评估页（全屏 overlay，从 Desk 下钻）：拍/选侧身照 → 评估服务(端侧VL/云端/预置) → 结构化结果。
 *   后端无关，失败自动回退预置；输出已过禁词链。详见 docs/模型与记忆个性化设计.md。
 *
 * [WHO] 导出 `AssessScreen`
 * [FROM] 依赖 `react`、`react-native`、`expo-image-picker`、`../../assess/service`、`../../assess/types`、`../theme`
 * [TO] 被 AppShell 在 assessOpen 时渲染
 * [HERE] src/ui/screens/AssessScreen.tsx · AI 体态评估页
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {createAssessService} from '../../assess/service';
import {loadAssessConfig} from '../../assess/config';
import {AssessReadiness, checkAssessReadiness} from '../../assess/readiness';
import {AssessmentResult, Severity} from '../../assess/types';
import {theme} from '../theme';

type Phase = 'idle' | 'loading' | 'done';

const SEV_COLOR: Record<Severity, string> = {ok: '#3A9E1F', mild: '#E08A00', warn: '#C20A0A'};
// 给普通用户看：只区分「真评估」与「示例」，不暴露云端/本地
const SOURCE_LABEL = {local: 'AI 实测', cloud: 'AI 实测', preset: '示例'} as const;

export function AssessScreen({onClose, onGoSettings}: {onClose: () => void; onGoSettings?: () => void}): React.JSX.Element {
  const service = useMemo(() => createAssessService(), []);
  const [phase, setPhase] = useState<Phase>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [readiness, setReadiness] = useState<AssessReadiness | null>(null);

  useEffect(() => {
    loadAssessConfig().then(checkAssessReadiness).then(setReadiness).catch(() => setReadiness(null));
  }, []);

  const run = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return;
      }
      const opts = {mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6} as const;
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) {
        return;
      }
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setPhase('loading');
      const out = await service.assess(asset.base64 ?? null);
      setResult(out);
      setPhase('done');
    } catch {
      // 选图/权限异常：保持当前态
      setPhase(prev => (prev === 'loading' ? 'idle' : prev));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.kicker}>AI 体态评估</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {phase === 'idle' ? (
          <>
            <Text style={styles.intro}>拍一张或选一张侧身坐姿照片，AI 帮你看看体态、给点小建议。仅供参考，非医疗诊断。</Text>

            {readiness && !readiness.ready ? (
              // 未就绪：口语化短引导 + 跳设置（不暴露技术细节）
              <View style={styles.guard}>
                <Text style={styles.guardTitle}>还没开启 AI 体态评估</Text>
                <Text style={styles.guardHint}>在设置里开启一次，就能拍照看体态啦。</Text>
                <View style={styles.pickRow}>
                  <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onGoSettings}>
                    <Text style={styles.btnPrimaryText}>去设置开启 ›</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => run(false)}>
                    <Text style={styles.btnGhostText}>先看示例</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => run(true)}>
                  <Text style={styles.btnPrimaryText}>拍照</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => run(false)}>
                  <Text style={styles.btnGhostText}>从相册选</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        {phase === 'loading' ? (
          <View style={styles.loading}>
            {imageUri ? <Image source={{uri: imageUri}} style={styles.preview} resizeMode="cover" /> : null}
            <ActivityIndicator color={theme.colors.primary} style={{marginTop: 20}} />
            <Text style={styles.loadingText}>评估中…</Text>
          </View>
        ) : null}

        {phase === 'done' && result ? (
          <>
            <View style={styles.resultHead}>
              {imageUri ? <Image source={{uri: imageUri}} style={styles.thumb} resizeMode="cover" /> : null}
              <View style={{flex: 1}}>
                <Text style={styles.sourceTag}>{SOURCE_LABEL[result.source]}</Text>
                <Text style={styles.summary}>{result.summary}</Text>
              </View>
            </View>

            <Text style={styles.section}>体态观察</Text>
            {result.observations.length === 0 ? (
              <Text style={styles.intro}>未解析出结构化观察，已给出总结与建议。</Text>
            ) : (
              result.observations.map((o, i) => (
                <View key={i} style={styles.obsRow}>
                  <Text style={styles.obsLabel}>{o.label}</Text>
                  <Text style={[styles.obsValue, o.severity ? {color: SEV_COLOR[o.severity]} : null]}>{o.value}</Text>
                </View>
              ))
            )}

            <Text style={styles.section}>建议</Text>
            {result.suggestions.map((s, i) => (
              <View key={i} style={styles.sugRow}>
                <Text style={styles.sugDot}>·</Text>
                <Text style={styles.sugText}>{s}</Text>
              </View>
            ))}

            <View style={styles.pickRow}>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={() => {
                  setPhase('idle');
                  setResult(null);
                  setImageUri(null);
                }}>
                <Text style={styles.btnGhostText}>重新评估</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onClose}>
                <Text style={styles.btnPrimaryText}>完成</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.surface, paddingTop: 48},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16},
  closeBtn: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  closeText: {color: theme.colors.textSecondary, fontSize: 20, fontWeight: theme.font.weightBold},
  kicker: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  body: {padding: 24, paddingBottom: 40},
  intro: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, lineHeight: 20, marginTop: 8},
  guard: {
    marginTop: 20,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#FCEAE0',
    borderWidth: 1,
    borderColor: 'rgba(251,75,0,0.3)',
  },
  guardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  guardHint: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, marginTop: 6, lineHeight: 17},
  guardRec: {color: theme.colors.primary, fontSize: theme.font.sizeXs, marginTop: 6, lineHeight: 17},
  backendTag: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 14, fontWeight: theme.font.weightBold},
  pickRow: {flexDirection: 'row', gap: 12, marginTop: 24},
  btn: {flex: 1, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center'},
  btnPrimary: {backgroundColor: theme.colors.primary},
  btnPrimaryText: {color: '#FFFFFF', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnGhost: {borderWidth: 1, borderColor: theme.colors.border},
  btnGhostText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  loading: {alignItems: 'center', marginTop: 24},
  preview: {width: 160, height: 213, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted},
  loadingText: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, marginTop: 10},
  resultHead: {flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 8},
  thumb: {width: 72, height: 96, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted},
  sourceTag: {
    alignSelf: 'flex-start',
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: theme.font.weightBold,
    backgroundColor: '#FCEAE0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  summary: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, lineHeight: 22},
  section: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginTop: 24, marginBottom: 10},
  obsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  obsLabel: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm},
  obsValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  sugRow: {flexDirection: 'row', gap: 8, paddingVertical: 5},
  sugDot: {color: theme.colors.primary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  sugText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, flex: 1, lineHeight: 20},
});
