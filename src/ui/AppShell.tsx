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
import {TrainingScreen} from './screens/TrainingScreen';
import {theme} from './theme';
import {FanIcon, GaugeIcon, SettingsIcon} from './icons';
import {MockScenario} from '../posture/mock';
import {DashboardState, PostureAction} from '../posture/types';
import {GrowthState} from '../posture/growth';
import {resumePendingDownloadIfNeeded} from '../mnn/modelDownloadService';

const TABS: Tab[] = [
  {value: 'desk', label: 'Desk', Icon: GaugeIcon},
  {value: 'plant', label: 'Plant', Icon: FanIcon},
  {value: 'settings', label: 'Settings', Icon: SettingsIcon},
];

type Props = {
  state: DashboardState;
  growth: GrowthState;
  mode: DataMode;
  deskSubtitle?: string;
  onUseSensor: () => void;
  onUseMock: () => void;
  onScenario: (s: MockScenario) => void;
};

export function AppShell({state, growth, mode, deskSubtitle, onUseSensor, onUseMock, onScenario}: Props): React.JSX.Element {
  const [tab, setTab] = useState('desk');
  // 跟练页：由 Desk 建议动作 chip 点击弹出的全屏聚焦 overlay（不占 tab）
  const [trainingAction, setTrainingAction] = useState<PostureAction | null>(null);

  useEffect(() => {
    resumePendingDownloadIfNeeded();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ModelDownloadBanner onOpenSettings={() => setTab('settings')} />
      {tab === 'desk' && <DeskScreen state={state} subtitle={deskSubtitle} onOpenTraining={setTrainingAction} />}
      {tab === 'plant' && <PlantScreen growth={growth} />}
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
      {trainingAction ? (
        <TrainingScreen action={trainingAction} onClose={() => setTrainingAction(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.surface},
});
