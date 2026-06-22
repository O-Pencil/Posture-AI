/**
 * @file pitchAtlas.ts
 * @description 俯仰（neck/pitch）轴雪碧图元数据。打包：node scripts/extract-pitch-frames.mjs --pack
 *
 * [WHO] 导出 `PITCH_ATLAS`
 * [FROM] public/atlas/pitch_atlas.png
 * [TO] 被 DeskScreen 传给 CatSprite（neckPitch 驱动）
 * [HERE] src/ui/assets/pitchAtlas.ts · 俯仰雪碧图元数据
 */
import type {ImageSourcePropType} from 'react-native';

export type AtlasMeta = {
  source: ImageSourcePropType | null;
  cols: number;
  rows: number;
  count: number;
  cellW?: number;
  cellH?: number;
};

// AUTO-GENERATED-ATLAS-START
export const PITCH_ATLAS: AtlasMeta = {
  source: require('../../../public/atlas/pitch_atlas.png'),
  cols: 10,
  rows: 6,
  count: 60,
  cellW: 540,
  cellH: 810,
};
// AUTO-GENERATED-ATLAS-END
