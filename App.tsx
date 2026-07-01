/**
 * @file App.tsx
 * @description 统一 Expo App 入口（iOS / Android / Web 一份代码）：持有引擎 + 传感器(优先)/模拟(回退) 数据源 + 当前状态，驱动 src/design/AppShell。
 *
 * [WHO] 默认导出 `App`；用 `createPostureEngine` + `createSensorSource`(回退 `createMockSource`)，渲染 `AppShell`
 * [FROM] 依赖 `react`、`./src/design/AppShell`、`./src/posture`（engine/mock/sensorSource/types）、`./src/design/i18n`
 * [TO] 被 `index.js`(registerRootComponent) 注册
 * [HERE] 项目根 /App.tsx · 统一 Expo App 入口（数据/状态宿主）
 *
 * UI 全在 src/design（RN 原语，RNW 兼容）；逻辑全在 src/posture。web(RNW) 无本机 IMU → 优先 WS 接收，失败回退 mock。
 * 端侧 Qwen+MNN 为安卓原生支线，默认不编 native。
 */
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold} from '@expo-google-fonts/fredoka';
import {Geist_400Regular, Geist_500Medium, Geist_700Bold} from '@expo-google-fonts/geist';
import {Quicksand_600SemiBold, Quicksand_700Bold} from '@expo-google-fonts/quicksand';

import {AppShell} from './src/design/AppShell';
import {loadLaunchSeen, saveLaunchSeen} from './src/platform/memory/store';
import {LaunchScreen} from './src/design/screens/LaunchScreen';
import {createPostureEngine} from './src/posture/engine';
import {createAdviceOrchestrator} from './src/posture/adviceOrchestrator';
import {createMemoryService} from './src/platform/memory/service';
import {createGrowthTracker, GrowthState} from './src/posture/growth';
import {createReminder} from './src/platform/reminder';
import {createMockSource, MockScenario, MockSource} from './src/posture/mock';
import {createSensorSource, SensorSource} from './src/platform/sensorSource';
import {BleSensorSource, BleStatus, createBleSensorSource} from './src/platform/bleSensorSource';
import {createWsSensorSource, WsSensorSource, WsStatus} from './src/platform/wsSensorSource';
import {createWsSenderSource, WsSenderSource} from './src/platform/wsSenderSource';
import {DashboardState} from './src/posture/types';
import {Locale, LocaleProvider, tr, useT} from './src/design/i18n';
import * as Device from 'expo-device';

function buildInitialState(locale: Locale): DashboardState {
  return {
    neckPitch: 0,
    thorPitch: 0,
    lumbarRoll: 0,
    posture: 'NORMAL',
    postureLabel: tr(locale, 'common.loading'),
    score: 100,
    abnormalDurationMinutes: 0,
    advice: '',
    inferenceSource: 'RULE_FALLBACK',
    streaming: false,
    action: null,
  };
}

type Mode = 'loading' | 'sensor' | 'mock' | 'ble' | 'ws' | 'ws-send';

function App(): React.JSX.Element {
  // 加载 Fredoka 字体（圆润可爱标题字体）
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const [launchSeen, setLaunchSeen] = useState<boolean | null>(null);

  // locale state 独立于 useRef 容器，让 engine / growth 通过 getter 拿到当前值
  const [locale, setLocaleState] = useState<Locale>('en');
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;

  // 引擎 / 成长累加器用 getter 读 locale → 切语言时调用 setLocale() 触发 emit
  const engineRef = useRef(createPostureEngine({getLocale: () => localeRef.current}));
  const sensorRef = useRef<SensorSource>(createSensorSource(engineRef.current));
  // 硬件数据源（ESP32+BNO085 姿态带，BLE）；连上后取代手机 IMU
  const bleRef = useRef<BleSensorSource>(createBleSensorSource(engineRef.current));
  // 保底数据源（另一台手机当姿态带，WS）；ESP32 没烧通时用
  const wsRef = useRef<WsSensorSource>(createWsSensorSource(engineRef.current));
  const wsSenderRef = useRef<WsSenderSource>(createWsSenderSource(engineRef.current));
  const mockRef = useRef<MockSource>(createMockSource(engineRef.current));
  // 语义记忆（教练"懂你"）：本地存储，注入教练 prompt 个性化；写入由 onboarding/反馈钩子调用
  const memoryRef = useRef(createMemoryService());
  // 模型建议异步编排（姿态变化/久持时后台生成温暖文案，流式写回；规则先兜底）
  const adviceRef = useRef(createAdviceOrchestrator(engineRef.current, memoryRef.current, {getLocale: () => localeRef.current}));
  // 植物成长累加器（真实坐姿 → 积分/阶段/日志，驱动 Plant 页）
  const growthRef = useRef(
    createGrowthTracker(engineRef.current, {getLocale: () => localeRef.current}),
  );
  // 异常坐姿震动提醒（非异常→异常入态那一下，带冷却）
  const reminderRef = useRef(createReminder(engineRef.current));

  const [k, setK] = useState<DashboardState>(() => buildInitialState(locale));
  const [growth, setGrowth] = useState<GrowthState>(() => growthRef.current.getState());
  const [mode, setMode] = useState<Mode>('loading');
  const [bleStatus, setBleStatus] = useState<BleStatus>('idle');
  const [wsStatus, setWsStatus] = useState<WsStatus>('idle');
  const [wsSendStatus, setWsSendStatus] = useState<WsStatus>('idle');
  const [wsSendInfo, setWsSendInfo] = useState<string | undefined>();

  // 停掉除当前要启用之外的所有数据源（数据源互斥）
  const stopOthers = (keep: 'sensor' | 'mock' | 'ble' | 'ws' | 'ws-send') => {
    if (keep !== 'sensor') sensorRef.current.stop();
    if (keep !== 'mock') mockRef.current.stop();
    if (keep !== 'ble') bleRef.current.stop();
    if (keep !== 'ws') wsRef.current.stop();
    if (keep !== 'ws-send') wsSenderRef.current.stop();
  };

  const useMockFallback = () => {
    mockRef.current.start();
    setMode('mock');
  };

  const useSensor = async () => {
    stopOthers('sensor');
    sensorRef.current.stop();
    const ok = await sensorRef.current.start();
    if (ok) {
      setMode('sensor');
    } else {
      useMockFallback();
    }
  };

  const useMock = () => {
    stopOthers('mock');
    mockRef.current.resume();
    mockRef.current.start();
    setMode('mock');
  };

  const pinScenario = (scenario: MockScenario) => {
    stopOthers('mock');
    mockRef.current.start();
    mockRef.current.setScenario(scenario);
    setMode('mock');
  };

  // 连硬件姿态带（BLE）；连上取代手机 IMU，连不上回退手机 IMU
  const useBle = async () => {
    stopOthers('ble');
    const ok = await bleRef.current.start();
    if (ok) {
      setMode('ble');
    } else {
      useSensor();
    }
  };

  // 连保底「手机姿态带（WS）」；连上取代手机 IMU，连不上回退手机 IMU
  const useWs = async () => {
    stopOthers('ws');
    const ok = await wsRef.current.start();
    if (ok) {
      setMode('ws');
    } else if (Platform.OS === 'web') {
      useMockFallback();
    } else {
      useSensor();
    }
  };

  const useWsSend = async () => {
    stopOthers('ws-send');
    const ok = await wsSenderRef.current.start();
    if (ok) {
      setMode('ws-send');
    }
    // 失败时不回退手机传感器，保留「姿态发送方」可选并显示 wsSendStatus 错误
  };

  // 坐直校准：作用于当前激活的姿态带（BLE / WS 接收）
  const calibrate = () => {
    if (mode === 'ws') {
      wsRef.current.calibrate();
    } else {
      bleRef.current.calibrate();
    }
  };

  useEffect(() => {
    loadLaunchSeen().then(setLaunchSeen);
  }, []);

  useEffect(() => {
    if (launchSeen !== true) {
      return;
    }
    const unsubscribe = engineRef.current.subscribe(setK);
    const unsubscribeGrowth = growthRef.current.subscribe(setGrowth);
    bleRef.current.onStatus(s => setBleStatus(s));
    wsRef.current.onStatus(s => setWsStatus(s));
    wsSenderRef.current.onStatus((s, info) => {
      setWsSendStatus(s);
      setWsSendInfo(info);
    });
    adviceRef.current.start();
    growthRef.current.start();
    reminderRef.current.start();
    // Web / 安卓模拟器：WS 接收；iPhone 真机：本机 IMU（发送方在 Settings 手动切）
    const boot =
      Platform.OS === 'web' || (Platform.OS === 'android' && Device.isDevice === false) ? useWs() : useSensor();
    boot.catch(() => {});
    memoryRef.current.ready.then(() => {
      const saved = memoryRef.current.locale();
      localeRef.current = saved;
      setLocaleState(saved);
    });
    return () => {
      unsubscribe();
      unsubscribeGrowth();
      adviceRef.current.stop();
      growthRef.current.stop();
      reminderRef.current.stop();
      sensorRef.current.stop();
      bleRef.current.stop();
      wsRef.current.stop();
      wsSenderRef.current.stop();
      mockRef.current.stop();
    };
  }, [launchSeen]);

  // locale 变化：engine 重算 + emit；growth 重新 snapshot
  useEffect(() => {
    engineRef.current.setLocale(locale);
    setGrowth(growthRef.current.getState());
  }, [locale]);

  const handleLocaleChange = (l: Locale) => {
    setLocaleState(l);
    memoryRef.current.setLocale(l);
  };

  const handleLaunchStart = () => {
    saveLaunchSeen(true).then(() => setLaunchSeen(true));
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {!fontsLoaded || launchSeen === null ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#141414" />
        </View>
      ) : !launchSeen ? (
        <LocaleProvider locale={locale} onChange={handleLocaleChange}>
          <LaunchScreen onStart={handleLaunchStart} />
        </LocaleProvider>
      ) : (
        <LocaleProvider locale={locale} onChange={handleLocaleChange}>
          <AppContent
            state={k}
            growth={growth}
            memory={memoryRef.current}
            mode={mode}
            bleStatus={bleStatus}
            wsStatus={wsStatus}
            wsSendStatus={wsSendStatus}
            wsSendInfo={wsSendInfo}
            onUseSensor={useSensor}
            onUseMock={useMock}
            onUseBle={useBle}
            onUseWs={useWs}
            onUseWsSend={useWsSend}
            onCalibrate={calibrate}
            onScenario={pinScenario}
          />
        </LocaleProvider>
      )}
    </SafeAreaProvider>
  );
}

function AppContent({
  state,
  growth,
  memory,
  mode,
  bleStatus,
  wsStatus,
  wsSendStatus,
  wsSendInfo,
  onUseSensor,
  onUseMock,
  onUseBle,
  onUseWs,
  onUseWsSend,
  onCalibrate,
  onScenario,
}: {
  state: DashboardState;
  growth: GrowthState;
  memory: ReturnType<typeof createMemoryService>;
  mode: Mode;
  bleStatus: BleStatus;
  wsStatus: WsStatus;
  wsSendStatus: WsStatus;
  wsSendInfo?: string;
  onUseSensor: () => Promise<void>;
  onUseMock: () => void;
  onUseBle: () => Promise<void>;
  onUseWs: () => Promise<void>;
  onUseWsSend: () => Promise<void>;
  onCalibrate: () => void;
  onScenario: (s: MockScenario) => void;
}): React.JSX.Element {
  const t = useT();
  const subtitle =
    // 对外口径：WS 与 BLE 一律呈现为「硬件姿态带（BLE）」，面向观众不暴露手机当传感器
    mode === 'ble' || mode === 'ws'
      ? '数据源：硬件姿态带（BLE）'
      : mode === 'ws-send'
      ? '本机：姿态发送方（WS）'
      : mode === 'sensor'
      ? t('settings.data.activeSensor')
      : mode === 'mock'
      ? t('settings.data.activeMock')
      : t('settings.data.loading');
  return (
    <AppShell
      state={state}
      growth={growth}
      memory={memory}
      mode={mode}
      bleStatus={bleStatus}
      wsStatus={wsStatus}
      wsSendStatus={wsSendStatus}
      wsSendInfo={wsSendInfo}
      deskSubtitle={subtitle}
      onUseSensor={onUseSensor}
      onUseMock={onUseMock}
      onUseBle={onUseBle}
      onUseWs={onUseWs}
      onUseWsSend={onUseWsSend}
      onCalibrate={onCalibrate}
      onScenario={onScenario}
    />
  );
}

export default App;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
