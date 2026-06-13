/**
 * @file App.tsx
 * @description 主工程 RN 仪表盘入口（iOS/Android 通用，纯 TS）：本地引擎 + 模拟数据源驱动共享 Dashboard，底部 F7 Mock Console。
 *
 * [WHO] 默认导出 `App`；用 `createPostureEngine` + `createMockSource` 驱动，复用 `Dashboard`
 * [FROM] 依赖 `react`、`react-native`、`./src/posture`（Dashboard/engine/mock/types）
 * [TO] 被 `index.js` 注册
 * [HERE] 项目根 /App.tsx · 主工程 RN 入口
 *
 * UI 与 expo-preview 共用 `src/posture/Dashboard.tsx`；逻辑共用 `src/posture/*`。
 * 端侧 Qwen+MNN 为原生支线（docs/端侧模型对接计划.md），就绪后由 engine.commit() 改调原生 inferText。
 */
import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Dashboard from './src/posture/Dashboard';
import {createPostureEngine} from './src/posture/engine';
import {createMockSource, MockScenario, MockSource, SCENARIOS} from './src/posture/mock';
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
};

function App(): React.JSX.Element {
  const [k, setK] = useState<DashboardState>(INITIAL);
  const engineRef = useRef(createPostureEngine());
  const mockRef = useRef<MockSource | null>(null);

  useEffect(() => {
    const mock = createMockSource(engineRef.current);
    mockRef.current = mock;
    const unsubscribe = engineRef.current.subscribe(setK);
    mock.start();
    return () => {
      mock.stop();
      unsubscribe();
    };
  }, []);

  const footer = (
    <View style={styles.console}>
      <Text style={styles.consoleTitle}>F7 MOCK CONSOLE</Text>
      <View style={styles.buttonRow}>
        {SCENARIOS.map((scenario: MockScenario) => (
          <TouchableOpacity
            key={scenario}
            style={[styles.btn, k.posture === scenario && styles.btnActive]}
            onPress={() => mockRef.current?.setScenario(scenario)}>
            <Text style={styles.btnText}>{scenario.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Dashboard
      state={k}
      subtitle="数据源：本地模拟流（10Hz）· 端侧模型见 docs/端侧模型对接计划.md"
      footer={footer}
    />
  );
}

const styles = StyleSheet.create({
  console: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#444',
  },
  consoleTitle: {color: '#ffdd00', fontSize: 10, fontWeight: 'bold', marginBottom: 10, textAlign: 'center'},
  buttonRow: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8},
  btn: {
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  btnActive: {borderColor: '#ffdd00', backgroundColor: '#332200'},
  btnText: {color: '#ccc', fontSize: 10},
});

export default App;
