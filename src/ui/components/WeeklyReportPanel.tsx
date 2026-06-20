/**
 * @file WeeklyReportPanel.tsx
 * @description 周报视图：最近 7 天每日积分柱图 + AI 周总结。柱高按本周最高分归一化；缺数据态用纯文字。
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {buildWeeklyReport, WeekDay} from '../../posture/dailyReport';
import {theme} from '../theme';
import {useLocale, useT} from '../i18n';

const LABEL_TO_KEY: Record<string, string> = {
  Sun: 'report.weekday.sun',
  Mon: 'report.weekday.mon',
  Tue: 'report.weekday.tue',
  Wed: 'report.weekday.wed',
  Thu: 'report.weekday.thu',
  Fri: 'report.weekday.fri',
  Sat: 'report.weekday.sat',
};

export function WeeklyReportPanel(): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const report = useMemo(() => buildWeeklyReport(locale), [locale]);

  if (!report.hasData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('report.weekly.emptyTitle')}</Text>
        <Text style={styles.emptyHint}>{t('report.weekly.emptyHint')}</Text>
      </View>
    );
  }

  const week = report.week;
  const maxPoints = Math.max(1, ...week.map(d => d.snapshot?.points ?? 0));

  return (
    <View style={styles.root}>
      <View style={styles.barsRow}>
        {week.map(d => (
          <Bar key={d.date} day={d} maxPoints={maxPoints} t={t} />
        ))}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{report.recordedDays}</Text>
          <Text style={styles.summaryLabel}>{t('report.weekly.recordedDays')}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{report.weekPoints}</Text>
          <Text style={styles.summaryLabel}>{t('report.weekly.weekPoints')}</Text>
        </View>
      </View>

      <View style={styles.aiBlock}>
        <Text style={styles.aiLabel}>{t('report.weekly.aiLabel')}</Text>
        <Text style={styles.aiText}>{report.aiSummary}</Text>
      </View>
    </View>
  );
}

type T = (key: string, vars?: Record<string, string | number>) => string;

function Bar({day, maxPoints, t}: {day: WeekDay; maxPoints: number; t: T}): React.JSX.Element {
  const points = day.snapshot?.points ?? 0;
  const heightPct = maxPoints > 0 ? Math.max(0.04, points / maxPoints) : 0.04;
  const recorded = day.snapshot !== null;
  const labelKey = LABEL_TO_KEY[day.label];
  const localizedLabel = labelKey ? t(labelKey) : day.label;
  return (
    <View style={styles.barCol}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {height: `${heightPct * 100}%`},
            !recorded && styles.barFillEmpty,
          ]}
        />
      </View>
      <Text style={styles.barValue} numberOfLines={1}>
        {recorded ? points : '—'}
      </Text>
      <Text style={[styles.barLabel, isWeekend(day) && styles.barLabelWeekend]}>{localizedLabel}</Text>
    </View>
  );
}

function isWeekend(d: WeekDay): boolean {
  return d.label === 'Sat' || d.label === 'Sun';
}

const BAR_HEIGHT = 90;

const styles = StyleSheet.create({
  root: {paddingVertical: 4},
  barsRow: {flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginBottom: 12},
  barCol: {flex: 1, alignItems: 'center', gap: 4},
  barTrack: {
    height: BAR_HEIGHT,
    width: '100%',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radius.sm,
    borderTopRightRadius: theme.radius.sm,
  },
  barFillEmpty: {backgroundColor: theme.colors.border, height: 4},
  barValue: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold, marginTop: 4},
  barLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs},
  barLabelWeekend: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
  summaryRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
  },
  summaryValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightHeavy},
  summaryLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 2},
  aiBlock: {
    backgroundColor: '#FFFAF5',
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2D5B7',
  },
  aiLabel: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold, marginBottom: 4, letterSpacing: 0.5},
  aiText: {color: theme.colors.textPrimary, fontSize: theme.font.sizeSm, lineHeight: 20},
  empty: {alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12},
  emptyTitle: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  emptyHint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 6},
});