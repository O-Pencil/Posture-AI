/**
 * @file AssessScreen.tsx
 * @description AI 体态评估页（全屏 overlay，从 Desk 下钻）：拍/选侧身照 → 评估服务(端侧VL/云端/预置) → 结构化结果。
 *   后端无关，失败自动回退预置；输出已过禁词链。详见 docs/模型与记忆个性化设计.md。
 *
 * [WHO] 导出 `AssessScreen`
 * [FROM] 依赖 `react`、`react-native`、`expo-image-picker`、`../../assess/service`、`../../assess/types`、`../theme`、`../i18n`
 * [TO] 被 AppShell 在 assessOpen 时渲染
 * [HERE] src/design/screens/AssessScreen.tsx · AI 体态评估页
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {createAssessService} from '../../assess/service';
import {loadAssessConfig} from '../../assess/config';
import {AssessReadiness, checkAssessReadiness} from '../../assess/readiness';
import {AssessmentResult, Severity} from '../../assess/types';
import {theme} from '../theme';
import {useLocale, useT} from '../i18n';

type Phase = 'idle' | 'loading' | 'done';

const SEV_COLOR: Record<Severity, string> = {ok: '#3A9E1F', mild: '#E08A00', warn: '#C20A0A'};

export function AssessScreen({onClose, onGoSettings}: {onClose: () => void; onGoSettings?: () => void}): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const service = useMemo(() => createAssessService(locale), [locale]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [readiness, setReadiness] = useState<AssessReadiness | null>(null);

  useEffect(() => {
    loadAssessConfig().then(checkAssessReadiness).then(setReadiness).catch(() => setReadiness(null));
  }, []);

  const sourceLabel = (src: AssessmentResult['source']) => {
    if (src === 'preset') {
      return t('assess.done.example');
    }
    return t('assess.sourceLabel.ai');
  };

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
        <Text style={styles.kicker}>{t('assess.kicker')}</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {phase === 'idle' ? (
          <>
            <Text style={styles.intro}>{t('assess.intro')}</Text>

            {readiness && !readiness.ready ? (
              // 未就绪：口语化短引导 + 跳设置（不暴露技术细节）
              <View style={styles.guard}>
                <Text style={styles.guardTitle}>{t('assess.guard.title')}</Text>
                <Text style={styles.guardHint}>{t('assess.guard.hint')}</Text>
                <View style={styles.pickRow}>
                  <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onGoSettings}>
                    <Text style={styles.btnPrimaryText}>{t('assess.guard.cta')}</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => run(false)}>
                    <Text style={styles.btnGhostText}>{t('assess.guard.preview')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => run(true)}>
                  <Text style={styles.btnPrimaryText}>{t('assess.button.takePhoto')}</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => run(false)}>
                  <Text style={styles.btnGhostText}>{t('assess.button.pick')}</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        {phase === 'loading' ? (
          <View style={styles.loading}>
            {imageUri ? <Image source={{uri: imageUri}} style={styles.preview} resizeMode="cover" /> : null}
            <ActivityIndicator color={theme.colors.primary} style={{marginTop: theme.spacing.xl}} />
            <Text style={styles.loadingText}>{t('assess.loading.hint')}</Text>
          </View>
        ) : null}

        {phase === 'done' && result ? (
          <>
            <View style={styles.resultHead}>
              {imageUri ? <Image source={{uri: imageUri}} style={styles.thumb} resizeMode="cover" /> : null}
              <View style={styles.resultCopy}>
                <Text style={styles.sourceTag}>{sourceLabel(result.source)}</Text>
                <Text style={styles.summary}>{result.summary}</Text>
              </View>
            </View>

            <Text style={styles.section}>{t('assess.observation')}</Text>
            {result.observations.length === 0 ? (
              <Text style={styles.intro}>{t('assess.noObservations')}</Text>
            ) : (
              result.observations.map((o, i) => (
                <View key={i} style={styles.obsRow}>
                  <Text style={styles.obsLabel}>{o.label}</Text>
                  <Text style={[styles.obsValue, o.severity ? {color: SEV_COLOR[o.severity]} : null]}>{o.value}</Text>
                </View>
              ))
            )}

            <Text style={styles.section}>{t('assess.suggestion')}</Text>
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
                <Text style={styles.btnGhostText}>{t('assess.button.retake')}</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onClose}>
                <Text style={styles.btnPrimaryText}>{t('common.finish')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.surface, zIndex: 20, elevation: 20, fontFamily: theme.font.body},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 48,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  closeBtn: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  closeText: {color: theme.colors.textSecondary, fontSize: 20, fontWeight: theme.font.weightBold},
  kicker: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontFamily: theme.font.displayMedium},
  scroll: {flex: 1, backgroundColor: theme.colors.surface},
  body: {padding: theme.spacing.xxl, paddingBottom: 40},
  intro: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, lineHeight: 20, marginTop: theme.spacing.sm2},
  guard: {
    marginTop: theme.spacing.xl,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#FCEAE0',
    borderWidth: 1,
    borderColor: 'rgba(251,75,0,0.3)',
  },
  guardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontFamily: theme.font.displayMedium},
  guardHint: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, marginTop: theme.spacing.sm, lineHeight: 17},
  pickRow: {flexDirection: 'row', gap: theme.spacing.md2, marginTop: theme.spacing.xxl},
  btn: {flex: 1, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center'},
  btnPrimary: {backgroundColor: theme.colors.primary},
  btnPrimaryText: {color: '#FFFFFF', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnGhost: {borderWidth: 1, borderColor: theme.colors.border},
  btnGhostText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  loading: {alignItems: 'center', marginTop: theme.spacing.xxl},
  preview: {width: 160, height: 213, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted},
  loadingText: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, marginTop: theme.spacing.md},
  resultHead: {flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: theme.spacing.sm2},
  thumb: {width: 72, height: 96, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted},
  sourceTag: {
    alignSelf: 'flex-start',
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    backgroundColor: '#FCEAE0',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  summary: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, lineHeight: 22},
  section: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md},
  obsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  obsLabel: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm},
  obsValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  resultCopy: {flex: 1},
  sugRow: {flexDirection: 'row', gap: theme.spacing.sm2, paddingVertical: 5},
  sugDot: {color: theme.colors.primary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  sugText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, flex: 1, lineHeight: 20},
});
