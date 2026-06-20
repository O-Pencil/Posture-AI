/**
 * @file MonitorScreen.tsx
 * @description Monitor 标签页：实时监控面板（演示用）。顶部当前姿态/分数/数据源摘要 + 运行日志（传感器/模型/推理/流程）。
 *   服务赛事「必须展示：模型本地加载 / 推理输入输出 / 核心交互流程」。
 *
 * [WHO] 导出 `MonitorScreen`
 * [FROM] 依赖 `react`、`react-native`、`../theme`、`../primitives/Card`、`../components/LogConsole`、`../../posture/types`、`./SettingsScreen`(DataMode)
 * [TO] 被 AppShell 在 monitor tab 渲染
 * [HERE] src/ui/screens/MonitorScreen.tsx · 监控页
 */
import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {LogConsole} from '../components/LogConsole';
import {DashboardState} from '../../posture/types';
import {DataMode} from './SettingsScreen';

function Stat({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function MonitorScreen({state, mode}: {state: DashboardState; mode: DataMode}): React.JSX.Element {
  const modeLabel = mode === 'sensor' ? '手机传感器' : mode === 'mock' ? '模拟流' : '检测中…';
  const srcLabel = state.inferenceSource === 'MODEL' ? '端侧模型' : '规则';
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Monitor</Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Stat label="姿态" value={state.postureLabel} />
          <Stat label="不驼背分" value={String(state.score)} />
        </View>
        <View style={[styles.row, styles.rowGap]}>
          <Stat label="数据源" value={modeLabel} />
          <Stat label="文案来源" value={srcLabel} />
        </View>
        <Text style={styles.hint}>颈 {state.neckPitch.toFixed(0)}° · 胸 {state.thorPitch.toFixed(0)}° · 腰 {state.lumbarRoll.toFixed(0)}°</Text>
      </Card>

      <LogConsole maxHeight={420} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.surface},
  container: {padding: theme.spacing.lg, paddingTop: 8, paddingBottom: 120},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightHeavy, marginBottom: 16},
  card: {marginBottom: theme.spacing.md},
  row: {flexDirection: 'row', gap: theme.spacing.md},
  rowGap: {marginTop: 12},
  stat: {flex: 1},
  statLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  statValue: {color: theme.colors.primary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginTop: 3},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 12},
});
