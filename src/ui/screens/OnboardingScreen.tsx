/**
 * @file OnboardingScreen.tsx
 * @description 首启问卷（全屏 overlay，仅走一次）：3 个轻问题 → 写入语义记忆（preference/struggle/entity）。
 *   完成后由 AppShell 标记 onboarded 并隐藏。可跳过（仍标记完成）。详见 docs/语义记忆设计.md。
 *
 * [WHO] 导出 `OnboardingScreen`
 * [FROM] 依赖 `react`、`react-native`、`../../posture/memory/types`、`../theme`、`../i18n`
 * [TO] 被 AppShell 在 memory 未 onboarded 时渲染
 * [HERE] src/ui/screens/OnboardingScreen.tsx · 首启问卷
 */
import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {RememberInput} from '../../posture/memory/types';
import {theme} from '../theme';
import {useT} from '../i18n';

type ToneKey = 'encourage' | 'direct' | 'gentle';
type AreaKey = 'neck' | 'back' | 'waist' | 'none';

function Chip({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function OnboardingScreen({onComplete}: {onComplete: (inputs: RememberInput[]) => void}): React.JSX.Element {
  const t = useT();
  const [tone, setTone] = useState<ToneKey | null>(null);
  const [area, setArea] = useState<AreaKey | null>(null);
  const [name, setName] = useState('');

  const finish = () => {
    const inputs: RememberInput[] = [];
    if (tone) {
      inputs.push({
        type: 'preference',
        text: t(`onboarding.mem.tone.${tone}`),
        tags: ['tone'],
        importance: 0.8,
        source: 'onboarding',
      });
    }
    if (area && area !== 'none') {
      inputs.push({
        type: 'struggle',
        text: t(`onboarding.mem.area.${area}`),
        tags: [area === 'neck' ? 'TECH_NECK' : area === 'back' ? 'SLUMPED' : 'LEFT_LEAN'],
        importance: 0.7,
        source: 'onboarding',
      });
    }
    const trimmed = name.trim();
    if (trimmed) {
      inputs.push({
        type: 'entity',
        text: t('onboarding.mem.name', {name: trimmed}),
        tags: ['name'],
        importance: 0.6,
        source: 'onboarding',
      });
    }
    onComplete(inputs);
  };

  const tones: ToneKey[] = ['encourage', 'direct', 'gentle'];
  const areas: AreaKey[] = ['neck', 'back', 'waist', 'none'];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text style={styles.kicker}>{t('onboarding.kicker')}</Text>
        <Text style={styles.title}>{t('onboarding.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        <Text style={styles.q}>{t('onboarding.q1')}</Text>
        <View style={styles.row}>
          {tones.map(k => (
            <Chip key={k} active={tone === k} label={t(`onboarding.tone.${k}`)} onPress={() => setTone(k)} />
          ))}
        </View>

        <Text style={styles.q}>{t('onboarding.q2')}</Text>
        <View style={styles.row}>
          {areas.map(k => (
            <Chip key={k} active={area === k} label={t(`onboarding.area.${k}`)} onPress={() => setArea(k)} />
          ))}
        </View>

        <Text style={styles.q}>{t('onboarding.q3')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('onboarding.namePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          maxLength={12}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => onComplete([])}>
          <Text style={styles.btnGhostText}>{t('onboarding.action.skip')}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={finish}>
          <Text style={styles.btnPrimaryText}>{t('onboarding.action.finish')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.surface,
    zIndex: 10,
    elevation: 10,
    fontFamily: theme.font.body,
  },
  scroll: {flex: 1},
  body: {padding: 28, paddingTop: 64, paddingBottom: 24},
  kicker: {color: theme.colors.textMuted, fontSize: 11, fontFamily: theme.font.displayMedium, letterSpacing: 1},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontFamily: theme.font.displaySemiBold, marginTop: 6},
  subtitle: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, lineHeight: 20, marginTop: 8},
  q: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginTop: 26, marginBottom: 12},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  chipText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm},
  chipTextActive: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.font.sizeMd,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  actions: {flexDirection: 'row', gap: 12, paddingHorizontal: 28, paddingBottom: 36, paddingTop: 8},
  btn: {flex: 1, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center'},
  btnGhost: {borderWidth: 1, borderColor: theme.colors.border},
  btnGhostText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnPrimary: {backgroundColor: theme.colors.primary},
  btnPrimaryText: {color: '#FFFFFF', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
});
