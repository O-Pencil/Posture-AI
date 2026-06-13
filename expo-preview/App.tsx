/**
 * @file App.tsx
 * @description Catune 传感器预览（Expo SDK 54）：复用主工程 src/posture 的引擎 + 共享 Dashboard UI，用手机 IMU 实时驱动；无传感器时回退 mock。
 *
 * [WHO] 默认导出 `App`；用共享 `createPostureEngine` + `createSensorSource`（回退 `createMockSource`），复用 `Dashboard`
 * [FROM] 依赖 `react`、`react-native`、`expo-status-bar`、`../src/posture/{Dashboard,engine,mock,types}`、`./sensorSource`
 * [TO] 被 expo-preview/index.js 注册；iPhone 用 Expo Go 扫码运行
 * [HERE] expo-preview/App.tsx · 传感器预览入口
 */
import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';

import Dashboard from '../src/posture/Dashboard';
import {createPostureEngine} from '../src/posture/engine';
import {createMockSource} from '../src/posture/mock';
import {DashboardState} from '../src/posture/types';
import {createSensorSource} from './sensorSource';

const INITIAL: DashboardState = {
  neckPitch: 0,
  thorPitch: 0,
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
    const unsubscribe = engineRef.current.subscribe(setS);
    startSensor();
    return () => {
      unsubscribe();
      sensorRef.current.stop();
      mockRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtitle =
    mode === 'sensor'
      ? '数据源：手机传感器 (DeviceMotion) · 倾斜手机试试'
      : mode === 'mock'
      ? '数据源：模拟 (无传感器)'
      : '检测传感器中…';

  const footer = (
    <View style={styles.footer}>
      <View style={styles.toggleRow}>
        <Toggle active={mode === 'sensor'} label="传感器" onPress={startSensor} />
        <Toggle active={mode === 'mock'} label="模拟" onPress={startMock} />
      </View>
      <Text style={styles.hint}>
        前后/左右倾斜手机，颈/胸/腰角度与建议实时变化。{'\n'}首次若弹运动权限请允许（或去 iOS 设置 → Expo Go → 运动与健身 打开）。
      </Text>
      <StatusBar style="light" />
    </View>
  );

  return <Dashboard state={s} subtitle={subtitle} footer={footer} />;
}

function Toggle({active, label, onPress}: {active: boolean; label: string; onPress: () => void}): React.JSX.Element {
  return (
    <TouchableOpacity style={[styles.toggle, active && styles.toggleActive]} onPress={onPress}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  footer: {width: '100%', alignItems: 'center'},
  toggleRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  toggle: {paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a'},
  toggleActive: {borderColor: '#ffdd00', backgroundColor: '#332200'},
  toggleText: {color: '#ccc', fontSize: 14},
  toggleTextActive: {color: '#ffdd00', fontWeight: '700'},
  hint: {color: '#64748B', fontSize: 12, textAlign: 'center'},
});
