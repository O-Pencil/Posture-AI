/**
 * @file LoopTabs.tsx
 * @description Plant 屏合并卡：原"积分日志卡"升级为"闭环卡"。
 *   一级 TAB：[事件] / [汇总]（默认事件）
 *   汇总内二级 pill：[日报] / [周报]（持久化）
 *   事件 TAB = 原 growth.log 渲染，0 改动
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {GrowthState} from '../../posture/growth';
import {Card} from '../primitives/Card';
import {theme} from '../theme';
import {DailyReportPanel} from './DailyReportPanel';
import {WeeklyReportPanel} from './WeeklyReportPanel';

type Props = {
  growth: GrowthState;
};

type PrimaryTab = 'events' | 'summary';
type SummaryTab = 'daily' | 'weekly';

const PRIMARY_OPTIONS: {value: PrimaryTab; label: string}[] = [
  {value: 'events', label: '事件'},
  {value: 'summary', label: '汇总'},
];

const SUMMARY_OPTIONS: {value: SummaryTab; label: string}[] = [
  {value: 'daily', label: '日报'},
  {value: 'weekly', label: '周报'},
];

export function LoopTabs({growth}: Props): React.JSX.Element {
  const [primary, setPrimary] = useState<PrimaryTab>('events');
  const [summary, setSummary] = useState<SummaryTab>('daily');

  // 二级 pill 状态持久化（同一会话内）
  useEffect(() => {
    // 这里只是占位：未来需要持久化跨会话时换成 AsyncStorage
  }, [summary]);

  const renderPrimary = useCallback(() => {
    if (primary === 'events') return <EventsView growth={growth} />;
    return <SummaryView growth={growth} summary={summary} onSummaryChange={setSummary} />;
  }, [primary, summary, growth]);

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
}: {
  growth: GrowthState;
  summary: SummaryTab;
  onSummaryChange: (s: SummaryTab) => void;
}): React.JSX.Element {
  return (
    <View>
      <View style={styles.summaryRow}>
        {SUMMARY_OPTIONS.map(opt => {
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
  const log = growth.log;
  if (log.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>还没有今日数据</Text>
        <Text style={styles.emptyHint}>保持坐姿即可累积积分；异常坐姿会在此记录。</Text>
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
          <Text style={[styles.logDelta, {color: e.delta > 0 ? '#3A9E1F' : '#C20A0A'}]}>
            {e.delta > 0 ? '+' : ''}
            {e.delta}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.sm, gap: 10},
  primaryRow: {flexDirection: 'row', gap: 8},
  primaryPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
  },
  primaryPillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  primaryPillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  primaryPillTextActive: {color: theme.colors.primary},
  divider: {height: 1, backgroundColor: theme.colors.border, marginVertical: 2},
  summaryRow: {flexDirection: 'row', gap: 6, marginBottom: 10},
  summaryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  summaryPillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  summaryPillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  summaryPillTextActive: {color: theme.colors.primary},
  logRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  logDivider: {borderBottomWidth: 1, borderBottomColor: theme.colors.border},
  logTextBlock: {flex: 1, minWidth: 0},
  logTime: {color: theme.colors.textMuted, fontSize: 11},
  logAction: {color: theme.colors.textSecondary, fontSize: 13, marginTop: 2},
  logDelta: {fontSize: 14, fontWeight: theme.font.weightBold, marginLeft: 12},
  empty: {alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12},
  emptyTitle: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  emptyHint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 6, textAlign: 'center'},
});
