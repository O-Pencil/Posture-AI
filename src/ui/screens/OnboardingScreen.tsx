/**
 * @file OnboardingScreen.tsx
 * @description 首启问卷（全屏 overlay，仅走一次）：3 个轻问题 → 写入语义记忆（preference/struggle/entity）。
 *   完成后由 AppShell 标记 onboarded 并隐藏。可跳过（仍标记完成）。详见 docs/语义记忆设计.md。
 *
 * [WHO] 导出 `OnboardingScreen`
 * [FROM] 依赖 `react`、`react-native`、`../../posture/memory/types`、`../theme`
 * [TO] 被 AppShell 在 memory 未 onboarded 时渲染
 * [HERE] src/ui/screens/OnboardingScreen.tsx · 首启问卷
 */
import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {RememberInput} from '../../posture/memory/types';
import {theme} from '../theme';

type Opt = {key: string; label: string};
const TONE: Array<Opt & {text: string}> = [
  {key: 'encourage', label: '鼓励式', text: '偏好鼓励式提醒'},
  {key: 'direct', label: '直接点', text: '偏好直接简短的提醒'},
  {key: 'gentle', label: '少打扰', text: '希望少打扰、必要时再提醒'},
];
const AREA: Array<Opt & {text: string | null; tags: string[]}> = [
  {key: 'neck', label: '脖子', text: '颈部容易不适、头前倾', tags: ['TECH_NECK']},
  {key: 'back', label: '肩背', text: '肩背容易含胸驼背', tags: ['SLUMPED']},
  {key: 'waist', label: '腰', text: '腰部容易侧倾或酸', tags: ['LEFT_LEAN']},
  {key: 'none', label: '还好', text: null, tags: []},
];

function Chip({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function OnboardingScreen({onComplete}: {onComplete: (inputs: RememberInput[]) => void}): React.JSX.Element {
  const [tone, setTone] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [name, setName] = useState('');

  const finish = () => {
    const inputs: RememberInput[] = [];
    const t = TONE.find(o => o.key === tone);
    if (t) {
      inputs.push({type: 'preference', text: t.text, tags: ['tone'], importance: 0.8, source: 'onboarding'});
    }
    const a = AREA.find(o => o.key === area);
    if (a && a.text) {
      inputs.push({type: 'struggle', text: a.text, tags: a.tags, importance: 0.7, source: 'onboarding'});
    }
    const trimmed = name.trim();
    if (trimmed) {
      inputs.push({type: 'entity', text: `称呼他「${trimmed}」`, tags: ['name'], importance: 0.6, source: 'onboarding'});
    }
    onComplete(inputs);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>CATUNE</Text>
        <Text style={styles.title}>认识一下你</Text>
        <Text style={styles.subtitle}>几个小问题，让教练更懂你。答案只存在本机，可随时在设置里清空。</Text>

        <Text style={styles.q}>1 · 想被怎样提醒？</Text>
        <View style={styles.row}>
          {TONE.map(o => (
            <Chip key={o.key} active={tone === o.key} label={o.label} onPress={() => setTone(o.key)} />
          ))}
        </View>

        <Text style={styles.q}>2 · 最近哪里容易不舒服？</Text>
        <View style={styles.row}>
          {AREA.map(o => (
            <Chip key={o.key} active={area === o.key} label={o.label} onPress={() => setArea(o.key)} />
          ))}
        </View>

        <Text style={styles.q}>3 · 怎么称呼你？（选填）</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="小雨"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={12}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => onComplete([])}>
          <Text style={styles.btnGhostText}>跳过</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={finish}>
          <Text style={styles.btnPrimaryText}>完成</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.surface},
  body: {padding: 28, paddingTop: 64, paddingBottom: 24},
  kicker: {color: theme.colors.textMuted, fontSize: 10, fontWeight: theme.font.weightBold, letterSpacing: 1},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightHeavy, marginTop: 6},
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
