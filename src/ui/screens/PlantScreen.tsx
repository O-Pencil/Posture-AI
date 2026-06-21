/**
 * @file PlantScreen.tsx
 * @description 植物养成屏（= web PlantPage 的 RN 还原）：5 阶段植物 SVG + 阶段进度 + 真实积分日志。浅色 Haptic。
 *   数据由 src/posture/growth.ts 的成长累加器驱动（真实坐姿 → 积分/阶段/日志），阶段条为只读进度指示。
 *
 * [WHO] 导出 `PlantScreen`
 * [FROM] 依赖 `react`、`react-native`、`react-native-svg`、`../theme`、`../primitives/Card`、`../icons`(SunIcon)、`../../posture/growth`(GrowthState)、`../i18n`
 * [TO] 被 `AppShell` 在 plant tab 渲染（接收 growth 真实数据）
 * [HERE] src/ui/screens/PlantScreen.tsx · 植物养成屏
 */
import React from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {SunIcon} from '../icons';
import {GrowthState, STAGE_NAMES} from '../../posture/growth';
import {LoopTabs} from '../components/LoopTabs';
import {useT} from '../i18n';

const STAGES = STAGE_NAMES.map((name, id) => ({id, name}));
const PLANT_IMAGE = require('../../../public/plant.png');

// 植物主视觉用 public/plant.png（旧的 5 阶段 SVG 已移除）。

export function PlantScreen({growth}: {growth: GrowthState}): React.JSX.Element {
  const t = useT();
  const stage = growth.stage;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('plant.title')}</Text>

      <Card style={styles.plantCard}>
        <View style={styles.plantHeader}>
          <View>
            <Text style={styles.kicker}>{t('plant.kicker')}</Text>
            <Text style={styles.cardTitle}>{t('plant.today')}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.dim}>{t('plant.stage')}</Text>
            <Text style={styles.stageText}>
              {stage} · {growth.stageName}
            </Text>
          </View>
        </View>

        <View style={styles.scene}>
          <View style={styles.sceneFloor} />
          <View style={styles.sun}>
            <SunIcon size={20} />
          </View>
          <Image source={PLANT_IMAGE} style={styles.plantImg} resizeMode="contain" />
        </View>

        {/* 阶段条为只读进度指示：高亮当前由积分推导的阶段 */}
        <View style={styles.selector}>
          {STAGES.map(st => {
            const active = st.id === stage;
            const stageName = t(`plant.stageNames.${st.name.toLowerCase()}` as 'plant.stageNames.seed');
            return (
              <View key={st.id} style={[styles.stageBtn, active && styles.stageBtnActive]}>
                <Text style={[styles.stageNum, active && styles.stageActiveText]}>{st.id}</Text>
                <Text style={[styles.stageName, active && styles.stageActiveText]}>{stageName}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <LoopTabs growth={growth} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.colors.background},
  container: {padding: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.md},
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontFamily: theme.font.displaySemiBold, marginBottom: theme.spacing.lg},

  plantCard: {gap: theme.spacing.lg},
  plantHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  kicker: {color: theme.colors.textMuted, fontSize: 11, fontFamily: theme.font.displayMedium, letterSpacing: 1},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeLg, fontFamily: theme.font.displayMedium, marginTop: theme.spacing.xs},
  dim: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs},
  stageText: {color: theme.colors.primary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginTop: theme.spacing.xxs},

  scene: {
    height: 224,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  plantImg: {width: '86%', height: '86%'},
  sceneFloor: {
    ...StyleSheet.absoluteFillObject,
    top: 112,
    backgroundColor: '#F5F0E8',
  },
  sun: {position: 'absolute', top: theme.spacing.md2, right: theme.spacing.md2, opacity: 0.35},

  selector: {flexDirection: 'row', gap: theme.spacing.sm},
  stageBtn: {flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: 'transparent'},
  stageBtnActive: {backgroundColor: 'rgba(251,75,0,0.10)', borderColor: 'rgba(251,75,0,0.40)'},
  stageNum: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  stageName: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: theme.spacing.xxs},
  stageActiveText: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
});
