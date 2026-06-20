/**
 * @file LogConsole.tsx
 * @description 运行日志面板（演示用）：订阅 logBus，实时展示 传感器/模型/推理/流程 事件，支持分类筛选与清空。
 *   用于赛事「必须展示：模型本地加载 / 推理输入输出 / 核心交互流程」的现场/录像证据。
 *
 * [WHO] 导出 `LogConsole`
 * [FROM] 依赖 `react`、`react-native`、`../../debug/logBus`、`../theme`、`../primitives/Card`
 * [TO] 被 SettingsScreen 渲染
 * [HERE] src/ui/components/LogConsole.tsx · 运行日志面板
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {clearLog, LogCategory, LogEntry, subscribeLog} from '../../debug/logBus';

const CAT_META: Record<LogCategory, {label: string; color: string}> = {
  sensor: {label: '传感器', color: '#3A9E1F'},
  model: {label: '模型', color: '#FB4B00'},
  infer: {label: '推理', color: '#0A66C2'},
  flow: {label: '流程', color: '#8A5A00'},
};

const FILTERS: Array<{key: 'all' | LogCategory; label: string}> = [
  {key: 'all', label: '全部'},
  {key: 'sensor', label: '传感器'},
  {key: 'model', label: '模型'},
  {key: 'infer', label: '推理'},
  {key: 'flow', label: '流程'},
];

function hms(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function LogConsole({maxHeight = 220}: {maxHeight?: number}): React.JSX.Element {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | LogCategory>('all');

  useEffect(() => subscribeLog(setEntries), []);

  const shown = useMemo(
    () => (filter === 'all' ? entries : entries.filter(e => e.category === filter)).slice(0, 80),
    [entries, filter],
  );

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>运行日志（演示）</Text>
        <Pressable hitSlop={8} onPress={clearLog}>
          <Text style={styles.clear}>清空</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>实时打印 传感器输入 / 端侧模型加载推理 输入输出 / 核心交互流程。</Text>

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <Pressable key={f.key} style={[styles.pill, filter === f.key && styles.pillActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={[styles.box, {maxHeight}]} nestedScrollEnabled>
        {shown.length === 0 ? (
          <Text style={styles.empty}>暂无日志。倾斜手机、触发提醒或端侧推理后，这里会实时滚动打印。</Text>
        ) : (
          shown.map(e => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.time}>{hms(e.ts)}</Text>
              <Text style={[styles.badge, {color: CAT_META[e.category].color}]}>{CAT_META[e.category].label}</Text>
              <Text style={styles.text} numberOfLines={3}>
                {e.text}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.md},
  head: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  clear: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  sub: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 6, lineHeight: 16},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  pillText: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs},
  pillTextActive: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
  box: {
    marginTop: 10,
    maxHeight: 220,
    backgroundColor: '#0E0E0E',
    borderRadius: theme.radius.md,
    padding: 10,
  },
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3},
  time: {color: '#6B6B6B', fontSize: 10, fontVariant: ['tabular-nums'], width: 54},
  badge: {fontSize: 10, fontWeight: theme.font.weightBold, width: 36},
  text: {color: '#E6E6E6', fontSize: 11, flex: 1, lineHeight: 16},
  empty: {color: '#8A8A8A', fontSize: theme.font.sizeXs, lineHeight: 18},
});
