/**
 * @file AppShell.tsx
 * @description 统一 App 外壳：底部 TabBar + 屏切换（Desk / Plant / Settings）。三端共用（iOS/Android/Web）。
 *
 * [WHO] 导出 `AppShell`
 * [FROM] 依赖 `react`、`react-native`(SafeAreaView/View)、`expo-status-bar`、`./components/TabBar`、`./screens/*`、`./theme`、`../posture/*`
 * [TO] 被 /App.tsx 渲染；数据/控制由 App 透传
 * [HERE] src/design/AppShell.tsx · 应用外壳（Tab 导航）
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';

import {AppSafeArea} from './components/AppSafeArea';

import {ModelDownloadBanner} from './components/ModelDownloadBanner';
import {Tab, TabBar} from './components/TabBar';
import {DeskScreen} from './screens/DeskScreen';
import {PlantScreen} from './screens/PlantScreen';
import {DataMode, SettingsScreen} from './screens/SettingsScreen';
import {MonitorScreen} from './screens/MonitorScreen';
import {TrainingScreen} from './screens/TrainingScreen';
import {OnboardingScreen} from './screens/OnboardingScreen';
import {AssessScreen} from './screens/AssessScreen';
import {theme} from './theme';
import {shellBackgroundForTab} from './theme/shellChrome';
import {FanIcon, GaugeIcon, MonitorIcon, SettingsIcon} from './icons';
import {MockScenario} from '../posture/mock';
import {DashboardState, PostureAction} from '../posture/types';
import {GrowthState} from '../posture/growth';
import {BleStatus} from '../platform/bleSensorSource';
import {WsStatus} from '../platform/wsSensorSource';
import {MemoryService} from '../platform/memory/service';
import {resumePendingDownloadIfNeeded} from '../mnn/modelDownloadService';
import {useT} from './i18n';

type Props = {
  state: DashboardState;
  growth: GrowthState;
  memory: MemoryService;
  mode: DataMode;
  bleStatus?: BleStatus;
  wsStatus?: WsStatus;
  wsSendStatus?: WsStatus;
  wsSendInfo?: string;
  deskSubtitle?: string;
  onUseSensor: () => void;
  onUseMock: () => void;
  onUseBle?: () => void;
  onUseWs?: () => void;
  onUseWsSend?: () => void;
  onCalibrate?: () => void;
  onScenario: (s: MockScenario) => void;
};

export function AppShell({
  state,
  growth,
  memory,
  mode,
  bleStatus,
  wsStatus,
  wsSendStatus,
  wsSendInfo,
  deskSubtitle,
  onUseSensor,
  onUseMock,
  onUseBle,
  onUseWs,
  onUseWsSend,
  onCalibrate,
  onScenario,
}: Props): React.JSX.Element {
  const t = useT();
  const TABS: Tab[] = useMemo(
    () => [
      {value: 'desk', label: t('shell.tab.desk'), Icon: GaugeIcon},
      {value: 'plant', label: t('shell.tab.plant'), Icon: FanIcon},
      {value: 'monitor', label: t('shell.tab.monitor'), Icon: MonitorIcon},
      {value: 'settings', label: t('shell.tab.settings'), Icon: SettingsIcon},
    ],
    [t],
  );
  const [tab, setTab] = useState('desk');
  // Plant 页入场缩放：点桌上植物 → 镜头推进(0→1 缩放+淡入)；走 Tab 切则瞬时为 1（无动画）
  const plantZoom = useRef(new Animated.Value(1)).current;
  const changeTab = (value: string) => {
    if (value === 'plant') {
      plantZoom.setValue(1); // 普通 Tab 切换：不做推进动画
    }
    setTab(value);
  };
  // 点击 Desk 桌上植物：镜头推进到 Plant 页
  const zoomToPlant = () => {
    plantZoom.setValue(0);
    setTab('plant');
    Animated.timing(plantZoom, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  // 跟练页：由 Desk 建议动作 chip 点击弹出的全屏聚焦 overlay（不占 tab）
  const [trainingAction, setTrainingAction] = useState<PostureAction | null>(null);
  // AI 评估页：由 Desk 入口下钻的全屏 overlay（不占 tab）
  const [assessOpen, setAssessOpen] = useState(false);
  // 首启问卷：null=加载中，false=未完成→展示，true=已完成
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    resumePendingDownloadIfNeeded();
    memory.ready.then(() => setOnboarded(memory.isOnboarded()));
  }, [memory]);

  const shellBg = shellBackgroundForTab(tab);

  return (
    <AppSafeArea style={[styles.root, {backgroundColor: shellBg}]}>
      <StatusBar style="dark" />
      <ModelDownloadBanner onOpenSettings={() => setTab('settings')} />
      {tab === 'desk' && !assessOpen && !trainingAction ? (
        <DeskScreen
          state={state}
          subtitle={deskSubtitle}
          onOpenTraining={setTrainingAction}
          onOpenAssess={() => setAssessOpen(true)}
          onZoomToPlant={zoomToPlant}
          memory={memory}
        />
      ) : null}
      {tab === 'plant' && (
        <Animated.View
          style={[
            styles.animatedScreen,
            {
            opacity: plantZoom,
            transform: [{scale: plantZoom.interpolate({inputRange: [0, 1], outputRange: [1.12, 1]})}],
            },
          ]}>
          <PlantScreen growth={growth} />
        </Animated.View>
      )}
      {tab === 'monitor' && <MonitorScreen state={state} mode={mode} />}
      {tab === 'settings' && (
        <SettingsScreen
          state={state}
          mode={mode}
          memory={memory}
          bleStatus={bleStatus}
          wsStatus={wsStatus}
          wsSendStatus={wsSendStatus}
          wsSendInfo={wsSendInfo}
          onUseSensor={onUseSensor}
          onUseMock={onUseMock}
          onUseBle={onUseBle}
          onUseWs={onUseWs}
          onUseWsSend={onUseWsSend}
          onCalibrate={onCalibrate}
          onScenario={onScenario}
        />
      )}
      {onboarded !== false && !assessOpen && !trainingAction ? (
        <TabBar tabs={TABS} value={tab} onChange={changeTab} />
      ) : null}
      {trainingAction ? (
        <TrainingScreen action={trainingAction} memory={memory} onClose={() => setTrainingAction(null)} />
      ) : null}
      {assessOpen ? (
        <AssessScreen
          onClose={() => setAssessOpen(false)}
          onGoSettings={() => {
            setAssessOpen(false);
            setTab('settings');
          }}
        />
      ) : null}
      {onboarded === false ? (
        <OnboardingScreen
          onComplete={inputs => {
            memory.completeOnboarding(inputs);
            setOnboarded(true);
          }}
        />
      ) : null}
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, fontFamily: theme.font.body},
  animatedScreen: {flex: 1},
});
