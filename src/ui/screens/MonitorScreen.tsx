/**
 * @file MonitorScreen.tsx
 * @description Monitor 标签页：实时监控面板（演示用）。顶部当前姿态/分数/数据源摘要 + 运行日志（传感器/模型/推理/流程）。
 *   服务赛事「必须展示：模型本地加载 / 推理输入输出 / 核心交互流程」。
 *   UI 文案全部走 useT() / tr(locale, …)，locale 切换时全屏文本跟随。
 *
 * [WHO] 导出 `MonitorScreen`
 * [FROM] 依赖 `react`、`react-native`、`../theme`、`../primitives/Card`、`../components/LogConsole`、`../../posture/types`、`../i18n`、`./SettingsScreen`(DataMode)
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
import {tr, useLocale, useT} from '../i18n';

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

/** 数据源模式 → 字典 key。loading 态未稳定前显示"检测中…/Detecting…"。
 *  对外口径：WS（手机当传感器）一律呈现为硬件姿态带（BLE），Monitor 不暴露手机传感器来源。 */
const MODE_LABEL_KEY: Record<DataMode, string> = {
  loading: 'monitor.mode.loading',
  sensor: 'monitor.mode.sensor',
  mock: 'monitor.mode.mock',
  ble: 'monitor.mode.ble',
  ws: 'monitor.mode.ble',
};

export function MonitorScreen({state, mode}: {state: DashboardState; mode: DataMode}): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const modeLabel = tr(locale, MODE_LABEL_KEY[mode] ?? MODE_LABEL_KEY.loading);
  const srcLabel = tr(locale, state.inferenceSource === 'MODEL' ? 'monitor.source.model' : 'monitor.source.rule');
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('monitor.title')}</Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Stat label={t('monitor.stat.posture')} value={state.postureLabel} />
          <Stat label={t('monitor.stat.score')} value={String(state.score)} />
        </View>
        <View style={[styles.row, styles.rowGap]}>
          <Stat label={t('monitor.stat.dataSource')} value={modeLabel} />
          <Stat label={t('monitor.stat.adviceSource')} value={srcLabel} />
        </View>
        <Text style={styles.hint}>
          {tr(locale, 'monitor.anglesHint', {
            neck: state.neckPitch.toFixed(0),
            thor: state.thorPitch.toFixed(0),
            lumbar: state.lumbarRoll.toFixed(0),
          })}
        </Text>
      </Card>

      <LogConsole maxHeight={420} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.surface},
  container: {padding: theme.spacing.lg, paddingTop: theme.spacing.sm2, paddingBottom: 120},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightHeavy, marginBottom: theme.spacing.lg},
  card: {marginBottom: theme.spacing.md},
  row: {flexDirection: 'row', gap: theme.spacing.md},
  rowGap: {marginTop: theme.spacing.md2},
  stat: {flex: 1},
  statLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  statValue: {color: theme.colors.primary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginTop: 3},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: theme.spacing.md2},
});