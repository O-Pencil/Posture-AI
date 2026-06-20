/**
 * @file TrainingScreen.tsx
 * @description 跟练页（全屏聚焦 overlay）：由 Desk 建议动作 chip 点击弹出，按动作播放引导式训练
 *   （准备 → 保持/放松 × reps → 完成），倒计时环 + 步骤提示 + 开始/暂停。三端共用。
 *
 * [WHO] 导出 `TrainingScreen`
 * [FROM] 依赖 `react`、`react-native`、`react-native-svg`、`../../posture/exercises`、`../../posture/types`、`../theme`、`../i18n`
 * [TO] 被 AppShell 在 trainingAction!=null 时作为顶层 overlay 渲染
 * [HERE] src/ui/screens/TrainingScreen.tsx · 跟练引导页
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

import {getExercise} from '../../posture/exercises';
import {PostureAction} from '../../posture/types';
import {getActionMeta} from '../../posture/actionTag';
import {MemoryService} from '../../posture/memory/service';
import {theme} from '../theme';
import {useLocale, useT} from '../i18n';

type Phase = 'ready' | 'hold' | 'rest' | 'done';
const READY_SEC = 3;
const RING = 120;
const STROKE = 10;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function TrainingScreen({
  action,
  onClose,
  memory,
}: {
  action: PostureAction;
  onClose: () => void;
  memory?: MemoryService;
}): React.JSX.Element | null {
  const {locale} = useLocale();
  const t = useT();
  const exercise = useMemo(() => getExercise(action, locale), [action, locale]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [rep, setRep] = useState(1);
  const [secLeft, setSecLeft] = useState(READY_SEC);
  const [running, setRunning] = useState(true);
  const [rated, setRated] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionLabel = getActionMeta(action, locale).label;

  const rateExercise = (good: boolean) => {
    if (memory) {
      const key = good ? 'training.memory.good' : 'training.memory.bad';
      memory.remember({
        type: good ? 'lesson' : 'preference',
        text: t(key, {label: actionLabel}),
        tags: [action],
        importance: good ? 0.6 : 0.4,
        source: 'feedback',
      });
    }
    setRated(true);
  };

  const phaseTotal = useMemo(() => {
    if (!exercise) {
      return 1;
    }
    if (phase === 'ready') {
      return READY_SEC;
    }
    return phase === 'rest' ? exercise.restSec : exercise.holdSec;
  }, [exercise, phase]);

  // 阶段推进
  const advance = useCallback(() => {
    if (!exercise) {
      return;
    }
    setPhase(prevPhase => {
      if (prevPhase === 'ready') {
        setSecLeft(exercise.holdSec);
        return 'hold';
      }
      if (prevPhase === 'hold') {
        if (rep >= exercise.reps) {
          setRunning(false);
          return 'done';
        }
        if (exercise.restSec <= 0) {
          setRep(r => r + 1);
          setSecLeft(exercise.holdSec);
          return 'hold';
        }
        setSecLeft(exercise.restSec);
        return 'rest';
      }
      // rest → 下一组 hold
      setRep(r => r + 1);
      setSecLeft(exercise.holdSec);
      return 'hold';
    });
  }, [exercise, rep]);

  useEffect(() => {
    if (!running || phase === 'done') {
      return;
    }
    timer.current = setInterval(() => {
      setSecLeft(s => {
        if (s > 1) {
          return s - 1;
        }
        advance();
        return 0;
      });
    }, 1000);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [running, phase, advance]);

  const restart = () => {
    setPhase('ready');
    setRep(1);
    setSecLeft(READY_SEC);
    setRunning(true);
  };

  if (!exercise) {
    return null;
  }

  const progress = phase === 'done' ? 1 : 1 - secLeft / Math.max(1, phaseTotal);
  const dashoffset = CIRC * (1 - progress);
  const isDone = phase === 'done';

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.kicker}>{t('training.kicker')}</Text>
        <View style={styles.closeBtn} />
      </View>

      <Text style={styles.intro}>{exercise.intro}</Text>

      <View style={styles.ringWrap}>
        <Svg width={RING} height={RING}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={theme.colors.border} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={isDone ? '#3A9E1F' : theme.colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          {isDone ? (
            <Text style={styles.doneMark}>✓</Text>
          ) : (
            <>
              <Text style={styles.bigSec}>{secLeft}</Text>
              <Text style={styles.phaseLabel}>{t(`training.phase.${phase}`)}</Text>
            </>
          )}
        </View>
      </View>

      {!isDone ? (
        <Text style={styles.repText}>
          {t('training.repText', {rep, total: exercise.reps})}
        </Text>
      ) : (
        <Text style={styles.repText}>{t('training.doneText')}</Text>
      )}

      <View style={styles.steps}>
        {exercise.steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNum}>{i + 1}</Text>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
      </View>

      {isDone && memory ? (
        rated ? (
          <Text style={styles.fbThanks}>{t('training.rateThanks')}</Text>
        ) : (
          <View style={styles.fbRow}>
            <Text style={styles.fbQ}>{t('training.rateQ')}</Text>
            <Pressable hitSlop={8} onPress={() => rateExercise(true)}>
              <Text style={styles.fbEmoji}>👍</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => rateExercise(false)}>
              <Text style={styles.fbEmoji}>👎</Text>
            </Pressable>
          </View>
        )
      ) : null}

      <View style={styles.actions}>
        {isDone ? (
          <>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={restart}>
              <Text style={styles.btnGhostText}>{t('training.restart')}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onClose}>
              <Text style={styles.btnPrimaryText}>{t('common.finish')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={restart}>
              <Text style={styles.btnGhostText}>{t('training.retry')}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setRunning(r => !r)}>
              <Text style={styles.btnPrimaryText}>{running ? t('common.pause') : t('common.resume')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.surface, paddingHorizontal: 24, paddingTop: 48, fontFamily: theme.font.body},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  closeBtn: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  closeText: {color: theme.colors.textSecondary, fontSize: 20, fontWeight: theme.font.weightBold},
  kicker: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontFamily: theme.font.displayMedium},
  intro: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, textAlign: 'center', marginTop: 10, lineHeight: 20},
  ringWrap: {alignSelf: 'center', marginTop: 28, width: RING, height: RING, alignItems: 'center', justifyContent: 'center'},
  ringCenter: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
  bigSec: {color: theme.colors.textPrimary, fontSize: 40, fontWeight: theme.font.weightHeavy, lineHeight: 44},
  phaseLabel: {color: theme.colors.primary, fontSize: theme.font.sizeSm, fontFamily: theme.font.displayMedium, marginTop: 2},
  doneMark: {color: '#3A9E1F', fontSize: 48, fontWeight: theme.font.weightHeavy},
  repText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, textAlign: 'center', marginTop: 18},
  steps: {marginTop: 22, gap: 10},
  stepRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FCEAE0',
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: theme.font.weightBold,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  stepText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, flex: 1, lineHeight: 20},
  fbRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20},
  fbQ: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm},
  fbEmoji: {fontSize: 22},
  fbThanks: {color: '#3A9E1F', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, textAlign: 'center', marginTop: 20},
  actions: {flexDirection: 'row', gap: 12, marginTop: 'auto', marginBottom: 36},
  btn: {flex: 1, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center'},
  btnGhost: {borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface},
  btnGhostText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnPrimary: {backgroundColor: theme.colors.primary},
  btnPrimaryText: {color: '#FFFFFF', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
});
