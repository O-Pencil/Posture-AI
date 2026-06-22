/**
 * @file PlantScreen.tsx
 * @description 植物养成屏：丘陵背景 + 裁切圆环 + 植物主视觉 + 今日积分文案 + 闭环日志卡。
 *
 * [WHO] 导出 `PlantScreen`
 * [FROM] 依赖 `react`、`react-native`、`../theme`、`../../posture/growth`(GrowthState, STAGE_THRESHOLDS)、`../components/LoopTabs`、`../components/PlantHeroScene`、`../i18n`
 * [TO] 被 `AppShell` 在 plant tab 渲染（接收 growth 真实数据）
 * [HERE] src/ui/screens/PlantScreen.tsx · 植物养成屏
 */
import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {GrowthState, STAGE_THRESHOLDS} from '../../posture/growth';
import {LoopTabs} from '../components/LoopTabs';
import {PlantHeroScene} from '../components/PlantHeroScene';
import {useT} from '../i18n';
import {theme} from '../theme';

const PLANT_PAGE = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#9B9B9B',
} as const;

const MAX_POINTS = STAGE_THRESHOLDS[STAGE_THRESHOLDS.length - 1];

function arcProgress(points: number): number {
  return Math.min(1, Math.max(0, points / MAX_POINTS));
}

function encourageKey(points: number): 'plant.encourage.great' | 'plant.encourage.good' | 'plant.encourage.keep' | 'plant.encourage.start' {
  if (points >= 90) return 'plant.encourage.great';
  if (points >= 50) return 'plant.encourage.good';
  if (points >= 20) return 'plant.encourage.keep';
  return 'plant.encourage.start';
}

export function PlantScreen({growth}: {growth: GrowthState}): React.JSX.Element {
  const t = useT();
  const progress = useMemo(() => arcProgress(growth.points), [growth.points]);

  return (
    <View style={styles.page}>
      <ScrollView style={styles.root} contentContainerStyle={styles.container}>
        <PlantHeroScene progress={progress} plantLabel={t('plant.today')} />

        <View style={styles.body}>
          <View style={styles.caption}>
            <Text style={styles.pointsLine}>{t('plant.pointsToday', {points: growth.points})}</Text>
            <Text style={styles.encourage}>{t(encourageKey(growth.points))}</Text>
            <Text style={styles.stageHint}>
              {growth.stage} · {growth.stageName}
            </Text>
          </View>

          <LoopTabs growth={growth} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: PLANT_PAGE.background},
  root: {flex: 1, backgroundColor: PLANT_PAGE.background},
  container: {
    paddingTop: 0,
    paddingBottom: 120,
    backgroundColor: PLANT_PAGE.background,
  },
  body: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginTop: 0,
  },
  caption: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  pointsLine: {
    color: PLANT_PAGE.textPrimary,
    fontSize: 22,
    fontFamily: theme.font.displaySemiBold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  encourage: {
    color: PLANT_PAGE.textSecondary,
    fontSize: theme.font.sizeMd,
    fontFamily: theme.font.display,
    textAlign: 'center',
  },
  stageHint: {
    color: PLANT_PAGE.textSecondary,
    fontSize: theme.font.sizeXs,
    fontFamily: theme.font.displayMedium,
    marginTop: theme.spacing.xxs,
    opacity: 0.85,
  },
});
