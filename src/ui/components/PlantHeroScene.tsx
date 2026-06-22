/**
 * @file PlantHeroScene.tsx
 * @description 植物页主视觉：bg-plant 整图作容器背景（底部自然弧度）+ 圆环 + 全宽植物。
 */
import React, {useMemo} from 'react';
import {Image, ImageBackground, StyleSheet, View, useWindowDimensions} from 'react-native';
import {PlantProgressArc} from './PlantProgressArc';

const BG_PLANT = require('../../../public/bg-plant.png');
const PLANT_IMAGE = require('../../../public/plant.png');

/** 与 bg-plant.png 顶部平铺区、状态栏背景一致 */
export const PLANT_SCENE_BG = '#F5F5F5';

/** bg-plant.png 原始宽高比 393×231 */
const BG_ASPECT = 231 / 393;

/** 容器最小高度：需容纳全宽植物 + 半圆环，高于素材原始比例 */
const SCENE_HEIGHT_RATIO = 0.96;

/** 植物相对基准尺寸的缩放 */
const PLANT_SCALE = 2.8;

/** 丘陵脊线：相对容器高度 */
const CREST_Y_RATIO = 0.6;

/** 植物整体再下移（相对容器高度） */
const PLANT_DOWN_OFFSET_RATIO = 0.07;

type Props = {
  progress: number;
  plantLabel: string;
};

export function PlantHeroScene({progress, plantLabel}: Props): React.JSX.Element {
  const {width: screenW} = useWindowDimensions();

  const layout = useMemo(() => {
    const sceneW = screenW;
    const sceneH = Math.max(sceneW * BG_ASPECT, sceneW * SCENE_HEIGHT_RATIO);
    /** 丘陵脊线：与拉伸后的 bg 弧度对齐 */
    const crestY = sceneH * CREST_Y_RATIO;

    const ringSize = Math.min(sceneW * 0.86, (crestY - 8) * 2);
    const ringTop = Math.max(8, crestY - ringSize * 0.5);

    const basePlantW = sceneW;
    const basePlantH = Math.min(sceneW * 0.72, crestY - 10);
    const plantW = basePlantW * PLANT_SCALE;
    const plantH = basePlantH * PLANT_SCALE;
    const plantLeft = (sceneW - plantW) / 2 + 20;
    const plantTop = "-5%";

    return {sceneW, sceneH, crestY, ringSize, ringTop, plantW, plantH, plantTop, plantLeft};
  }, [screenW]);

  return (
    <ImageBackground
      source={BG_PLANT}
      style={[styles.scene, {width: layout.sceneW, height: layout.sceneH}]}
      resizeMode="stretch"
      accessibilityRole="image">
      <View style={[styles.ringLayer, {top: layout.ringTop, width: layout.sceneW}]} pointerEvents="none">
        <PlantProgressArc progress={progress} size={layout.ringSize} />
      </View>

      <Image
        source={PLANT_IMAGE}
        style={[
          styles.plant,
          {
            width: layout.plantW,
            height: layout.plantH,
            top: layout.plantTop,
            left: layout.plantLeft,
          },
        ]}
        resizeMode="contain"
        accessibilityLabel={plantLabel}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  ringLayer: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
  },
  plant: {
    position: 'absolute',
    zIndex: 2,
  },
});
