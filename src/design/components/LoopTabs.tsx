/**
 * @file LoopTabs.tsx
 * @description Plant 屏合并卡：原"积分日志卡"升级为"闭环卡"。
 *   一级 TAB：[事件] / [汇总]（默认事件）
 *   汇总内二级 pill：[日报] / [周报]（持久化）
 *   事件 TAB = 原 growth.log 渲染，0 改动
 *
 * [WHO] 导出 `LoopTabs`
 * [FROM] 依赖 `react`、`react-native`、`../../posture/growth`(GrowthState)、`./DailyReportPanel`、`./WeeklyReportPanel`
 * [TO] 被 PlantScreen 渲染
 * [HERE] src/design/components/LoopTabs.tsx · Plant 闭环卡（一级 TAB + 汇总内二级 pill）
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {GrowthState} from '../../posture/growth';
import {Card} from '../primitives/Card';
import {theme} from '../theme';
import {useT} from '../i18n';
import {DailyReportPanel} from './DailyReportPanel';
import {WeeklyReportPanel} from './WeeklyReportPanel';

type Props = {
  growth: GrowthState;
};

type PrimaryTab = 'events' | 'summary';
type SummaryTab = 'daily' | 'weekly';

type TabOption<V extends string> = {value: V; label: string};

export function LoopTabs({growth}: Props): React.JSX.Element {
  const t = useT();
  const PRIMARY_OPTIONS: TabOption<PrimaryTab>[] = [
    {value: 'events', label: t('loopTabs.events')},
    {value: 'summary', label: t('loopTabs.summary')},
  ];
  const SUMMARY_OPTIONS = useMemo<TabOption<SummaryTab>[]>(() => [
    {value: 'daily', label: t('loopTabs.daily')},
    {value: 'weekly', label: t('loopTabs.weekly')},
  ], [t]);

  const [primary, setPrimary] = useState<PrimaryTab>('events');
  const [summary, setSummary] = useState<SummaryTab>('daily');

  // 二级 pill 状态持久化（同一会话内）
  useEffect(() => {
    // 这里只是占位：未来需要持久化跨会话时换成 AsyncStorage
  }, [summary]);

  const renderPrimary = useCallback(() => {
    if (primary === 'events') return <EventsView growth={growth} />;
    return (
      <SummaryView
        growth={growth}
        summary={summary}
        onSummaryChange={setSummary}
        options={SUMMARY_OPTIONS}
      />
    );
  }, [primary, summary, growth, SUMMARY_OPTIONS]);

  return (
    <Card style={styles.card}>
      {/* 一级 TAB */}
      <View style={styles.primaryRow}>
        {PRIMARY_OPTIONS.map(opt => {
          const active = opt.value === primary;
          return (
            <Pressable
              key={opt.value}
              style={[styles.primaryPill, active && styles.primaryPillActive]}
              onPress={() => setPrimary(opt.value)}>
              <Text style={[styles.primaryPillText, active && styles.primaryPillTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      {renderPrimary()}
    </Card>
  );
}

function SummaryView({
  growth,
  summary,
  onSummaryChange,
  options,
}: {
  growth: GrowthState;
  summary: SummaryTab;
  onSummaryChange: (s: SummaryTab) => void;
  options: TabOption<SummaryTab>[];
}): React.JSX.Element {
  return (
    <View>
      <View style={styles.summaryRow}>
        {options.map(opt => {
          const active = opt.value === summary;
          return (
            <Pressable
              key={opt.value}
              style={[styles.summaryPill, active && styles.summaryPillActive]}
              onPress={() => onSummaryChange(opt.value)}>
              <Text style={[styles.summaryPillText, active && styles.summaryPillTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {summary === 'daily' ? <DailyReportPanel growth={growth} /> : <WeeklyReportPanel />}
    </View>
  );
}

function EventsView({growth}: {growth: GrowthState}): React.JSX.Element {
  const t = useT();
  const log = growth.log;
  if (log.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('plant.eventsEmpty.title')}</Text>
        <Text style={styles.emptyHint}>{t('plant.eventsEmpty.hint')}</Text>
      </View>
    );
  }
  return (
    <View>
      {log.map((e, i) => (
        <View key={e.id} style={[styles.logRow, i < log.length - 1 && styles.logDivider]}>
          <View style={styles.logTextBlock}>
            <Text style={styles.logTime}>{e.time}</Text>
            <Text style={styles.logAction} numberOfLines={1}>
              {e.action}
            </Text>
          </View>
          <Text style={[styles.logDelta, e.delta > 0 ? styles.logDeltaPositive : styles.logDeltaNegative]}>
            {e.delta > 0 ? '+' : ''}
            {e.delta}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.sm, gap: theme.spacing.md},
  primaryRow: {flexDirection: 'row', gap: theme.spacing.sm2},
  primaryPill: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
  },
  primaryPillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  primaryPillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  primaryPillTextActive: {color: theme.colors.primary},
  divider: {height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xxs},
  summaryRow: {flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md},
  summaryPill: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  summaryPillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  summaryPillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  summaryPillTextActive: {color: theme.colors.primary},
  logRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md},
  logDivider: {borderBottomWidth: 1, borderBottomColor: theme.colors.border},
  logTextBlock: {flex: 1, minWidth: 0},
  logTime: {color: theme.colors.textMuted, fontSize: 11},
  logAction: {color: theme.colors.textSecondary, fontSize: 13, marginTop: theme.spacing.xxs},
  logDelta: {fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginLeft: theme.spacing.md2},
  logDeltaPositive: {color: '#3A9E1F'},
  logDeltaNegative: {color: '#C20A0A'},
  empty: {alignItems: 'center', paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.md2},
  emptyTitle: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  emptyHint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: theme.spacing.sm, textAlign: 'center'},
});
