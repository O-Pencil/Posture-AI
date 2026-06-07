/**
 * @file App.tsx
 * @description React Native 仪表盘根组件：订阅 KinematicsModule 实时姿态数据，渲染 Posture Score / Neck Pitch / Lumbar Roll / F7 Mock Console。
 *
 * [WHO] 默认导出 `function App(): React.JSX.Element`；内部 `useState`/`useEffect` 订阅 NativeEventEmitter `onKinematicsUpdate`、`KinematicsModule.getLatestState()` 与 `setSimulationScenario()` 调用、StyleSheet 样式
 * [FROM] 依赖 `react`（useEffect/useState）、`react-native`（SafeAreaView/ScrollView/StatusBar/TouchableOpacity/View/Text/NativeModules/NativeEventEmitter）、`react-native/Libraries/NewAppScreen`（Colors/Header）
 * [TO] 被 `index.js` 通过 `AppRegistry.registerComponent(appName, () => App)` 注册并由 RN runtime 渲染
 * [HERE] 项目根 /App.tsx · RN 仪表盘入口（F1-F6 UI + F7 Mock Console）
 */
/**
 * Catune React Native Dashboard
 * Full MVP implementation with F7 Mock Console.
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  NativeModules,
  NativeEventEmitter,
  TouchableOpacity,
} from 'react-native';

import {
  Colors,
  Header,
} from 'react-native/Libraries/NewAppScreen';

const { KinematicsModule } = NativeModules;
const kinematicsEmitter = new NativeEventEmitter(KinematicsModule);

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [kinematics, setKinematics] = useState({
    neckPitch: 0,
    lumbarRoll: 0,
    posture: 'NORMAL',
    postureLabel: 'Initializing...',
    score: 100,
  });

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  useEffect(() => {
    // 1. Get initial state
    KinematicsModule.getLatestState().then(setKinematics);

    // 2. Subscribe to updates from Kotlin
    const subscription = kinematicsEmitter.addListener(
      'onKinematicsUpdate',
      (data) => {
        setKinematics(data);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const getStatusColor = () => {
    switch (kinematics.posture) {
      case 'NORMAL': return '#00ff00';
      case 'OFFLINE': return '#888';
      default: return '#ff3300';
    }
  };

  const renderMockConsole = () => (
    <View style={styles.consoleContainer}>
      <Text style={styles.consoleTitle}>F7 MOCK CONSOLE</Text>
      <View style={styles.buttonRow}>
        {['NORMAL', 'SLUMPED', 'TECH_NECK', 'LEFT_LEAN', 'OFFLINE'].map(scenario => (
          <TouchableOpacity 
            key={scenario}
            style={[styles.smallButton, kinematics.posture === scenario && styles.activeButton]}
            onPress={() => KinematicsModule.setSimulationScenario(scenario)}>
            <Text style={styles.smallButtonText}>{scenario.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        
        <View style={styles.mainContainer}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>POSTURE SCORE</Text>
            <Text style={[styles.scoreValue, { color: getStatusColor() }]}>{kinematics.score}</Text>
          </View>

          <View style={styles.dataContainer}>
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>Neck Pitch</Text>
              <Text style={[styles.dataValue, { color: '#00ff00' }]}>
                {kinematics.neckPitch.toFixed(1)}°
              </Text>
            </View>
            
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>Lumbar Roll</Text>
              <Text style={[styles.dataValue, { color: '#00ddff' }]}>
                {kinematics.lumbarRoll.toFixed(1)}°
              </Text>
            </View>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Current State</Text>
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>
              {kinematics.postureLabel}
            </Text>
          </View>

          {renderMockConsole()}

          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => {
                // Future: Start/Stop Service
            }}>
            <Text style={styles.buttonText}>START MCP SERVICE</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    padding: 20,
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 100,
    width: 160,
    height: 160,
    alignSelf: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#333'
  },
  scoreLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold'
  },
  scoreValue: {
    fontSize: 60,
    fontWeight: '800',
  },
  dataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataBox: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  dataLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusBox: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center'
  },
  statusLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  consoleContainer: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444'
  },
  consoleTitle: {
    color: '#ffdd00',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8
  },
  smallButton: {
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333'
  },
  activeButton: {
    borderColor: '#ffdd00',
    backgroundColor: '#332200'
  },
  smallButtonText: {
    color: '#ccc',
    fontSize: 10,
  },
  mainButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default App;
