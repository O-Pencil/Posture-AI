/**
 * @file App.tsx
 * @description Catune 传感器预览（Expo SDK 54）：复用主工程 src/posture 的 TS 引擎，用手机 IMU 实时驱动仪表盘；无传感器时回退 mock。
 *
 * [WHO] 默认导出 `App`；用共享 `createPostureEngine` + `createSensorSource`（回退 `createMockSource`）
 * [FROM] 依赖 `react`、`react-native`、`expo-status-bar`、`../src/posture/{engine,mock,types}`、`./sensorSource`
 * [TO] 被 expo-preview/index.js 注册；iPhone 用 Expo Go 扫码运行
 * [HERE] expo-preview/App.tsx · 传感器预览入口
 */
import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';

import {createPostureEngine} from '../src/posture/engine';
import {createMockSource} from '../src/posture/mock';
import {DashboardState} from '../src/posture/types';
import {createSensorSource} from './sensorSource';

const INITIAL: DashboardState = {
  neckPitch: 0,
  lumbarRoll: 0,
  posture: 'NORMAL',
  postureLabel: 'Initializing…',
  score: 100,
  abnormalDurationMinutes: 0,
  advice: '',
  inferenceSource: 'RULE_FALLBACK',
};

type Mode = 'loading' | 'sensor' | 'mock';

export default function App(): React.JSX.Element {
  const [s, setS] = useState<DashboardState>(INITIAL);
  const [mode, setMode] = useState<Mode>('loading');

  const engineRef = useRef(createPostureEngine());
  const sensorRef = useRef(createSensorSource(engineRef.current));
  const mockRef = useRef(createMockSource(engineRef.current));

  // 启动：优先真实传感器，不可用则回退 mock
  const startSensor = async () => {
    mockRef.current.stop();
    const ok = await sensorRef.current.start();
    if (ok) {
      setMode('sensor');
    } else {
      mockRef.current.start();
      setMode('mock');
    }
  };

  const startMock = () => {
    sensorRef.current.stop();
    mockRef.current.start();
    setMode('mock');
  };

  useEffect(() => {
    const unsub = engineRef.current.subscribe(setS);
    startSensor();
    return () => {
      unsub();
      sensorRef.current.stop();
      mockRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const color =
    s.posture === 'NORMAL' ? '#10B981' : s.posture === 'OFFLINE' ? '#6B7280' : '#EF4444';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Catune · 传感器预览</Text>
        <Text style={styles.sub}>
          数据源：
          {mode === 'sensor' ? '手机传感器 (DeviceMotion)' : mode === 'mock' ? '模拟 (无传感器)' : '检测中…'}
        </Text>

        <View style={[styles.scoreCircle, {borderColor: color}]}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={[styles.score, {color}]}>{s.score}</Text>
        </View>

        <View style={styles.row}>
          <Metric label="Neck Pitch" value={`${s.neckPitch.toFixed(1)}°`} />
          <Metric label="Lumbar Roll" value={`${s.lumbarRoll.toFixed(1)}°`} />
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.dim}>状态</Text>
          <Text style={[styles.status, {color}]}>{s.postureLabel}</Text>
        </View>

        {s.advice ? (
          <View style={styles.advice}>
            <Text style={styles.adviceLabel}>建议（规则）</Text>
            <Text style={styles.adviceText}>{s.advice}</Text>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <Toggle active={mode === 'sensor'} label="传感器" onPress={startSensor} />
          <Toggle active={mode === 'mock'} label="模拟" onPress={startMock} />
        </View>

        <Text style={styles.hint}>
          把手机前后/左右倾斜，分数、状态、建议会实时变化。{'\n'}
          首次进入若弹出运动权限，请允许。
        </Text>
      </ScrollView>
    </View>
  );
}

function Metric({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Toggle({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.toggle, active && styles.toggleActive]}
      onPress={onPress}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0A0F1A'},
  container: {padding: 24, paddingTop: 64, alignItems: 'center'},
  title: {color: '#F1F5F9', fontSize: 20, fontWeight: '800'},
  sub: {color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 24},
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scoreLabel: {color: '#94A3B8', fontSize: 12, fontWeight: 'bold'},
  score: {fontSize: 56, fontWeight: '800'},
  row: {flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16},
  metric: {backgroundColor: '#111827', padding: 16, borderRadius: 12, width: '48%', alignItems: 'center'},
  metricValue: {color: '#F1F5F9', fontSize: 24, fontWeight: '700', marginTop: 4},
  statusBox: {backgroundColor: '#111827', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 16},
  dim: {color: '#94A3B8', fontSize: 12},
  status: {fontSize: 18, fontWeight: '600', marginTop: 4},
  advice: {backgroundColor: '#10210f', padding: 16, borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#1f3d1c', marginBottom: 20},
  adviceLabel: {color: '#7bdc6e', fontSize: 12, fontWeight: 'bold', marginBottom: 6},
  adviceText: {color: '#d6f5d0', fontSize: 14, lineHeight: 20},
  toggleRow: {flexDirection: 'row', gap: 12, marginBottom: 16},
  toggle: {paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a'},
  toggleActive: {borderColor: '#ffdd00', backgroundColor: '#332200'},
  toggleText: {color: '#ccc', fontSize: 13},
  toggleTextActive: {color: '#ffdd00', fontWeight: '700'},
  hint: {color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 8},
});
