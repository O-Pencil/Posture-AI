/**
 * @file Dashboard.tsx
 * @description 共享仪表盘 UI（iOS/Android 通用，只用稳定 RN API）：渲染分数 + 3 节点角度(颈/胸/腰) + 状态 + 建议；底部 footer 槽放各 app 自己的控制区。
 *   主工程 App.tsx 与 expo-preview/App.tsx 都引用本组件（真·一份 UI）。
 *
 * [WHO] 默认导出 `Dashboard`，命名导出 `getStatusColor`
 * [FROM] 依赖 `react`、`react-native`(View/Text/StyleSheet/ScrollView)、`./types`(DashboardState)
 * [TO] 被 /App.tsx 与 expo-preview/App.tsx 复用；footer 传入 F7 控制台 / 传感器切换
 * [HERE] src/posture/Dashboard.tsx · 共享仪表盘 UI
 */
import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {DashboardState} from './types';

export function getStatusColor(posture: string): string {
  if (posture === 'NORMAL') {
    return '#10B981';
  }
  if (posture === 'OFFLINE') {
    return '#6B7280';
  }
  return '#EF4444';
}

type DashboardProps = {
  state: DashboardState;
  /** 副标题，如数据来源说明。 */
  subtitle?: string;
  /** 各 app 自己的控制区（F7 控制台 / 传感器切换）。 */
  footer?: React.ReactNode;
};

function Metric({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function Dashboard({state, subtitle, footer}: DashboardProps): React.JSX.Element {
  const color = getStatusColor(state.posture);
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Catune · 不驼背坐姿助手</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={[styles.scoreCircle, {borderColor: color}]}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={[styles.score, {color}]}>{state.score}</Text>
      </View>

      <View style={styles.row}>
        <Metric label="颈 Neck" value={`${state.neckPitch.toFixed(1)}°`} />
        <Metric label="胸 Thor" value={`${state.thorPitch.toFixed(1)}°`} />
        <Metric label="腰 Lumbar" value={`${state.lumbarRoll.toFixed(1)}°`} />
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.dim}>状态</Text>
        <Text style={[styles.status, {color}]}>{state.postureLabel}</Text>
      </View>

      {state.advice ? (
        <View style={styles.advice}>
          <Text style={styles.adviceLabel}>
            建议{state.inferenceSource === 'RULE_FALLBACK' ? '（规则）' : ''}
          </Text>
          <Text style={styles.adviceText}>{state.advice}</Text>
        </View>
      ) : null}

      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0A0F1A'},
  container: {padding: 20, paddingTop: 56, alignItems: 'center'},
  title: {color: '#F1F5F9', fontSize: 20, fontWeight: '800'},
  subtitle: {color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 20, textAlign: 'center'},
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  scoreLabel: {color: '#94A3B8', fontSize: 12, fontWeight: 'bold'},
  score: {fontSize: 56, fontWeight: '800'},
  row: {flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16},
  metric: {backgroundColor: '#111827', padding: 12, borderRadius: 12, width: '31.5%', alignItems: 'center'},
  metricValue: {color: '#F1F5F9', fontSize: 20, fontWeight: '700', marginTop: 4},
  statusBox: {backgroundColor: '#111827', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 16},
  dim: {color: '#94A3B8', fontSize: 12},
  status: {fontSize: 18, fontWeight: '600', marginTop: 4},
  advice: {backgroundColor: '#10210f', padding: 16, borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#1f3d1c', marginBottom: 16},
  adviceLabel: {color: '#7bdc6e', fontSize: 12, fontWeight: 'bold', marginBottom: 6},
  adviceText: {color: '#d6f5d0', fontSize: 14, lineHeight: 20},
});
