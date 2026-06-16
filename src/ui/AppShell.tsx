/**
 * @file AppShell.tsx
 * @description 统一 App 外壳：底部 TabBar + 屏切换（Desk / Plant / Settings）。三端共用（iOS/Android/Web）。
 *
 * [WHO] 导出 `AppShell`
 * [FROM] 依赖 `react`、`react-native`(SafeAreaView/View)、`expo-status-bar`、`./components/TabBar`、`./screens/*`、`./theme`、`../posture/*`
 * [TO] 被 /App.tsx 渲染；数据/控制由 App 透传
 * [HERE] src/ui/AppShell.tsx · 应用外壳（Tab 导航）
 */
import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';

import {ModelDownloadBanner} from './components/ModelDownloadBanner';
import {Tab, TabBar} from './components/TabBar';
import {DeskScreen} from './screens/DeskScreen';
import {PlantScreen} from './screens/PlantScreen';
import {DataMode, SettingsScreen} from './screens/SettingsScreen';
import {theme} from './theme';
import {FanIcon, GaugeIcon, SettingsIcon} from './icons';
import {MockScenario} from '../posture/mock';
import {DashboardState} from '../posture/types';
import {resumePendingDownloadIfNeeded} from '../mnn/modelDownloadService';

const TABS: Tab[] = [
  {value: 'desk', label: 'Desk', Icon: GaugeIcon},
  {value: 'plant', label: 'Plant', Icon: FanIcon},
  {value: 'settings', label: 'Settings', Icon: SettingsIcon},
];

type Props = {
  state: DashboardState;
  mode: DataMode;
  deskSubtitle?: string;
  onUseSensor: () => void;
  onUseMock: () => void;
  onScenario: (s: MockScenario) => void;
};

export function AppShell({state, mode, deskSubtitle, onUseSensor, onUseMock, onScenario}: Props): React.JSX.Element {
  const [tab, setTab] = useState('desk');

  useEffect(() => {
    resumePendingDownloadIfNeeded();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ModelDownloadBanner onOpenSettings={() => setTab('settings')} />
      {tab === 'desk' && <DeskScreen state={state} subtitle={deskSubtitle} />}
      {tab === 'plant' && <PlantScreen />}
      {tab === 'settings' && (
        <SettingsScreen
          state={state}
          mode={mode}
          onUseSensor={onUseSensor}
          onUseMock={onUseMock}
          onScenario={onScenario}
        />
      )}
      <TabBar tabs={TABS} value={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.surface},
});
