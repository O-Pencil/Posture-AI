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
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Ellipse, Path, Rect} from 'react-native-svg';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {SunIcon} from '../icons';
import {GrowthState, STAGE_NAMES} from '../../posture/growth';
import {LoopTabs} from '../components/LoopTabs';
import {useT} from '../i18n';

const STAGES = STAGE_NAMES.map((name, id) => ({id, name}));

const P = {
  potBody: '#C2725A',
  potRim: '#A0563D',
  potHi: '#D4886F',
  soil: '#5C3D24',
  sprout: '#A3B559',
  stemYoung: '#7BA05B',
  stemMid: '#5B8043',
  stemMature: '#3F6A2E',
  leaf: '#7BA05B',
  leafLight: '#9DBE6E',
  bud: '#CE82FF',
  budLight: '#E9B0FF',
  fruitRed: '#C75348',
  fruitYellow: '#E8A93C',
};

function PlantSvg({stage}: {stage: number}): React.JSX.Element {
  return (
    <Svg width={176} height={176} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={93} rx={30} ry={3} fill="#000000" opacity={0.1} />
      {/* Pot */}
      <Path d="M 14 70 L 22 92 L 58 92 L 66 70 Z" fill={P.potBody} />
      <Path d="M 14 70 L 66 70 L 64 73 L 16 73 Z" fill={P.potRim} />
      <Rect x={14} y={67} width={52} height={4} rx={1} fill={P.potHi} />
      <Ellipse cx={40} cy={70} rx={24} ry={2.5} fill={P.soil} />

      {stage === 0 && <Ellipse cx={50} cy={68} rx={3} ry={1.5} fill={P.sprout} />}

      {stage === 1 && (
        <>
          <Path d="M 50 68 L 50 50" stroke={P.stemYoung} strokeWidth={2} strokeLinecap="round" />
          <Ellipse cx={46} cy={55} rx={6} ry={2.5} fill={P.leafLight} rotation={-25} originX={46} originY={55} />
          <Ellipse cx={54} cy={52} rx={6} ry={2.5} fill={P.leafLight} rotation={25} originX={54} originY={52} />
        </>
      )}

      {stage === 2 && (
        <>
          <Path d="M 50 68 L 50 35" stroke={P.stemMid} strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={40} cy={50} rx={9} ry={3.5} fill={P.leaf} rotation={-25} originX={40} originY={50} />
          <Ellipse cx={60} cy={45} rx={9} ry={3.5} fill={P.leaf} rotation={25} originX={60} originY={45} />
          <Ellipse cx={42} cy={62} rx={7} ry={3} fill={P.leafLight} rotation={-15} originX={42} originY={62} />
          <Ellipse cx={58} cy={58} rx={7} ry={3} fill={P.leafLight} rotation={15} originX={58} originY={58} />
          <Circle cx={50} cy={35} r={2} fill={P.leaf} />
        </>
      )}

      {stage === 3 && (
        <>
          <Path d="M 50 68 L 50 22" stroke={P.stemMature} strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={38} cy={50} rx={11} ry={4} fill={P.leaf} rotation={-30} originX={38} originY={50} />
          <Ellipse cx={62} cy={44} rx={11} ry={4} fill={P.leaf} rotation={30} originX={62} originY={44} />
          <Ellipse cx={40} cy={62} rx={9} ry={3.5} fill={P.leafLight} rotation={-15} originX={40} originY={62} />
          <Ellipse cx={60} cy={56} rx={9} ry={3.5} fill={P.leafLight} rotation={15} originX={60} originY={56} />
          <Ellipse cx={50} cy={22} rx={8} ry={10} fill={P.bud} />
          <Ellipse cx={50} cy={22} rx={5} ry={7} fill={P.budLight} />
        </>
      )}

      {stage === 4 && (
        <>
          <Path d="M 50 68 L 50 14" stroke={P.stemMature} strokeWidth={3.5} strokeLinecap="round" />
          <Ellipse cx={35} cy={50} rx={13} ry={4.5} fill={P.leaf} rotation={-30} originX={35} originY={50} />
          <Ellipse cx={65} cy={45} rx={13} ry={4.5} fill={P.leaf} rotation={30} originX={65} originY={45} />
          <Ellipse cx={40} cy={64} rx={10} ry={4} fill={P.leafLight} rotation={-15} originX={40} originY={64} />
          <Ellipse cx={60} cy={60} rx={10} ry={4} fill={P.leafLight} rotation={15} originX={60} originY={60} />
          <Circle cx={42} cy={40} r={4} fill={P.fruitRed} />
          <Circle cx={58} cy={38} r={4} fill={P.fruitYellow} />
          <Circle cx={50} cy={22} r={3.5} fill={P.fruitRed} />
          <Circle cx={46} cy={30} r={3} fill={P.fruitYellow} />
        </>
      )}
    </Svg>
  );
}

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
          <PlantSvg stage={stage} />
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
  title: {color: theme.colors.textPrimary, fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, paddingHorizontal: 4, marginBottom: 8},

  plantCard: {gap: 16},
  plantHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  kicker: {color: theme.colors.textMuted, fontSize: 10, fontWeight: theme.font.weightBold, letterSpacing: 1},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginTop: 4},
  dim: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs},
  stageText: {color: theme.colors.primary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold, marginTop: 2},

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
  sceneFloor: {
    ...StyleSheet.absoluteFillObject,
    top: 112,
    backgroundColor: '#F5F0E8',
  },
  sun: {position: 'absolute', top: 12, right: 12, opacity: 0.35},

  selector: {flexDirection: 'row', gap: 6},
  stageBtn: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: 'transparent'},
  stageBtnActive: {backgroundColor: 'rgba(251,75,0,0.10)', borderColor: 'rgba(251,75,0,0.40)'},
  stageNum: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
  stageName: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 2},
  stageActiveText: {color: theme.colors.primary, fontWeight: theme.font.weightBold},
});
