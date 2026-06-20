/**
 * @file DailyReportPanel.tsx
 * @description 日报视图：今日分 / 不驼背时长 / Streak / AI 评论（规则兜底）。无数据态用纯文字。
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GrowthState} from '../../posture/growth';
import {buildDailyReport} from '../../posture/dailyReport';
import {theme} from '../theme';
import {useLocale, useT} from '../i18n';

type Props = {
  growth: GrowthState;
};

export function DailyReportPanel({growth}: Props): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const report = useMemo(() => buildDailyReport(growth, locale), [growth, locale]);

  if (!report.hasData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('report.daily.emptyTitle')}</Text>
        <Text style={styles.emptyHint}>{t('report.daily.emptyHint')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreNum}>{report.points}</Text>
        <Text style={styles.scoreLabel}>{t('report.daily.points')}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{report.goodMinutes}</Text>
          <Text style={styles.statLabel}>{t('report.daily.goodMinutes')}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{report.abnormalCount}</Text>
          <Text style={styles.statLabel}>{t('report.daily.abnormal')}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{report.streakDays}</Text>
          <Text style={styles.statLabel}>{t('report.daily.streak')}</Text>
        </View>
      </View>

      <View style={styles.aiBlock}>
        <Text style={styles.aiLabel}>{t('report.daily.aiLabel')}</Text>
        <Text style={styles.aiText}>{report.aiComment}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {paddingVertical: 4},
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  scoreNum: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeScore,
    fontWeight: theme.font.weightHeavy,
  },
  scoreLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  statsRow: {flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12},
  statCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
  },
  statValue: {color: theme.colors.textPrimary, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightHeavy},
  statLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 2},
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