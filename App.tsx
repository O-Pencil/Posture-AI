/**
 * @file App.tsx
 * @description 统一 Expo App 入口（iOS / Android / Web 一份代码）：持有引擎 + 传感器(优先)/模拟(回退) 数据源 + 当前状态，驱动 src/ui/AppShell（Desk/Plant/Settings）。
 *
 * [WHO] 默认导出 `App`；用 `createPostureEngine` + `createSensorSource`(回退 `createMockSource`)，渲染 `AppShell`
 * [FROM] 依赖 `react`、`./src/ui/AppShell`、`./src/posture`（engine/mock/sensorSource/types）、`./src/ui/i18n`
 * [TO] 被 `index.js`(registerRootComponent) 注册
 * [HERE] 项目根 /App.tsx · 统一 Expo App 入口（数据/状态宿主）
 *
 * UI 全在 src/ui（RN 原语，RNW 兼容）；逻辑全在 src/posture。web(RNW) 无传感器 → 自动回退 mock。
 * 端侧 Qwen+MNN 为安卓原生支线（docs/端侧模型对接计划.md）。
 */
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold} from '@expo-google-fonts/fredoka';
import {Geist_400Regular, Geist_500Medium, Geist_700Bold} from '@expo-google-fonts/geist';

import {AppShell} from './src/ui/AppShell';
import {createPostureEngine} from './src/posture/engine';
import {createAdviceOrchestrator} from './src/posture/adviceOrchestrator';
import {createMemoryService} from './src/platform/memory/service';
import {createGrowthTracker, GrowthState} from './src/posture/growth';
import {createReminder} from './src/platform/reminder';
import {createMockSource, MockScenario, MockSource} from './src/posture/mock';
import {createSensorSource, SensorSource} from './src/platform/sensorSource';
import {DashboardState} from './src/posture/types';
import {Locale, LocaleProvider, useT} from './src/ui/i18n';

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
  streaming: false,
  action: null,
};

type Mode = 'loading' | 'sensor' | 'mock';

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
  });

  // locale state 独立于 useRef 容器，让 engine / growth 通过 getter 拿到当前值
  const [locale, setLocaleState] = useState<Locale>('en');
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;

  // 引擎 / 成长累加器用 getter 读 locale → 切语言时调用 setLocale() 触发 emit
  const engineRef = useRef(createPostureEngine({getLocale: () => localeRef.current}));
  const sensorRef = useRef<SensorSource>(createSensorSource(engineRef.current));
  const mockRef = useRef<MockSource>(createMockSource(engineRef.current));
  // 语义记忆（教练"懂你"）：本地存储，注入教练 prompt 个性化；写入由 onboarding/反馈钩子调用
  const memoryRef = useRef(createMemoryService());
  // 模型建议异步编排（姿态变化/久持时后台生成温暖文案，流式写回；规则先兜底）
  const adviceRef = useRef(createAdviceOrchestrator(engineRef.current, memoryRef.current));
  // 植物成长累加器（真实坐姿 → 积分/阶段/日志，驱动 Plant 页）
  const growthRef = useRef(
    createGrowthTracker(engineRef.current, {getLocale: () => localeRef.current}),
  );
  // 异常坐姿震动提醒（非异常→异常入态那一下，带冷却）
  const reminderRef = useRef(createReminder(engineRef.current));

  const [k, setK] = useState<DashboardState>(INITIAL);
  const [growth, setGrowth] = useState<GrowthState>(() => growthRef.current.getState());
  const [mode, setMode] = useState<Mode>('loading');

  const useSensor = async () => {
    mockRef.current.stop();
    const ok = await sensorRef.current.start();
    if (ok) {
      setMode('sensor');
    } else {
      mockRef.current.start();
      setMode('mock');
    }
  };

  const useMock = () => {
    sensorRef.current.stop();
    mockRef.current.resume();
    mockRef.current.start();
    setMode('mock');
  };

  const pinScenario = (scenario: MockScenario) => {
    sensorRef.current.stop();
    mockRef.current.start();
    mockRef.current.setScenario(scenario);
    setMode('mock');
  };

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(setK);
    const unsubscribeGrowth = growthRef.current.subscribe(setGrowth);
    adviceRef.current.start();
    growthRef.current.start();
    reminderRef.current.start();
    void useSensor();
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
      mockRef.current.stop();
    };
    // refs 是 stable 的（useRef），无需列入 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/rules-of-hooks
  }, []);

  // locale 变化：engine 重算 + emit；growth 重新 snapshot
  useEffect(() => {
    engineRef.current.setLocale(locale);
    setGrowth(growthRef.current.getState());
  }, [locale]);

  const handleLocaleChange = (l: Locale) => {
    setLocaleState(l);
    memoryRef.current.setLocale(l);
  };

  // 字体加载中显示 loading
  if (!fontsLoaded) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F0EC'}}>
        <ActivityIndicator size="small" color="#FB4B00" />
      </View>
    );
  }

  return (
    <LocaleProvider locale={locale} onChange={handleLocaleChange}>
      <AppContent
        state={k}
        growth={growth}
        memory={memoryRef.current}
        mode={mode}
        onUseSensor={useSensor}
        onUseMock={useMock}
        onScenario={pinScenario}
      />
    </LocaleProvider>
  );
}

function AppContent({
  state,
  growth,
  memory,
  mode,
  onUseSensor,
  onUseMock,
  onScenario,
}: {
  state: DashboardState;
  growth: GrowthState;
  memory: ReturnType<typeof createMemoryService>;
  mode: Mode;
  onUseSensor: () => Promise<void>;
  onUseMock: () => void;
  onScenario: (s: MockScenario) => void;
}): React.JSX.Element {
  const t = useT();
  const subtitle =
    mode === 'sensor' ? t('settings.data.activeSensor') : mode === 'mock' ? t('settings.data.activeMock') : t('settings.data.loading');
  return (
    <AppShell
      state={state}
      growth={growth}
      memory={memory}
      mode={mode}
      deskSubtitle={subtitle}
      onUseSensor={onUseSensor}
      onUseMock={onUseMock}
      onScenario={onScenario}
    />
  );
}

export default App;
