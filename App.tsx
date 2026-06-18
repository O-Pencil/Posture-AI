/**
 * @file App.tsx
 * @description 统一 Expo App 入口（iOS / Android / Web 一份代码）：持有引擎 + 传感器(优先)/模拟(回退) 数据源 + 当前状态，驱动 src/ui/AppShell（Desk/Plant/Settings）。
 *
 * [WHO] 默认导出 `App`；用 `createPostureEngine` + `createSensorSource`(回退 `createMockSource`)，渲染 `AppShell`
 * [FROM] 依赖 `react`、`./src/ui/AppShell`、`./src/posture`（engine/mock/sensorSource/types）
 * [TO] 被 `index.js`(registerRootComponent) 注册
 * [HERE] 项目根 /App.tsx · 统一 Expo App 入口（数据/状态宿主）
 *
 * UI 全在 src/ui（RN 原语，RNW 兼容）；逻辑全在 src/posture。web(RNW) 无传感器 → 自动回退 mock。
 * 端侧 Qwen+MNN 为安卓原生支线（docs/端侧模型对接计划.md）。
 */
import React, {useEffect, useRef, useState} from 'react';

import {AppShell} from './src/ui/AppShell';
import {createPostureEngine} from './src/posture/engine';
import {createAdviceOrchestrator} from './src/posture/adviceOrchestrator';
import {createMemoryService} from './src/posture/memory/service';
import {createGrowthTracker, GrowthState} from './src/posture/growth';
import {createMockSource, MockScenario, MockSource} from './src/posture/mock';
import {createSensorSource, SensorSource} from './src/posture/sensorSource';
import {DashboardState} from './src/posture/types';

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
  const engineRef = useRef(createPostureEngine());
  const sensorRef = useRef<SensorSource>(createSensorSource(engineRef.current));
  const mockRef = useRef<MockSource>(createMockSource(engineRef.current));
  // 语义记忆（教练"懂你"）：本地存储，注入教练 prompt 个性化；写入由 onboarding/反馈钩子调用
  const memoryRef = useRef(createMemoryService());
  // 模型建议异步编排（姿态变化/久持时后台生成温暖文案，流式写回；规则先兜底）
  const adviceRef = useRef(createAdviceOrchestrator(engineRef.current, memoryRef.current));
  // 植物成长累加器（真实坐姿 → 积分/阶段/日志，驱动 Plant 页）
  const growthRef = useRef(createGrowthTracker(engineRef.current));

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
    useSensor();
    return () => {
      unsubscribe();
      unsubscribeGrowth();
      adviceRef.current.stop();
      growthRef.current.stop();
      sensorRef.current.stop();
      mockRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtitle =
    mode === 'sensor'
      ? '数据源：手机传感器 · 倾斜手机'
      : mode === 'mock'
      ? '数据源：本地模拟流（10Hz）'
      : '检测传感器中…';

  return (
    <AppShell
      state={k}
      growth={growth}
      memory={memoryRef.current}
      mode={mode}
      deskSubtitle={subtitle}
      onUseSensor={useSensor}
      onUseMock={useMock}
      onScenario={pinScenario}
    />
  );
}

export default App;
