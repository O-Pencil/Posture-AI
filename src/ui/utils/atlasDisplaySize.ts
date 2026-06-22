import {ImageSourcePropType, PixelRatio} from 'react-native';
import {resolveImageAsset} from './resolveImageAsset';

export type AtlasCellSize = {
  source?: ImageSourcePropType | null;
  cols?: number;
  rows?: number;
  cellW?: number;
  cellH?: number;
};

/**
 * 图集单格物理像素 → 逻辑尺寸上限，避免高 DPI 设备上放大雪碧图导致发糊。
 * 优先用 Metro 打包后的真实图集尺寸（resolveAssetSource），避免 meta cellW 与 bundle 不一致。
 */
export function maxAtlasLogicalSize(atlas: AtlasCellSize): {maxWidth: number; maxHeight: number} {
  const ratio = PixelRatio.get();
  const cols = atlas.cols ?? 1;
  const rows = atlas.rows ?? 1;

  if (atlas.source) {
    const fallback =
      atlas.cellW && atlas.cellH && cols > 0 && rows > 0
        ? {width: atlas.cellW * cols, height: atlas.cellH * rows}
        : undefined;
    const resolved = resolveImageAsset(atlas.source, fallback);
    if (resolved?.width && resolved?.height && cols > 0 && rows > 0) {
      return {
        maxWidth: resolved.width / cols / ratio,
        maxHeight: resolved.height / rows / ratio,
      };
    }
  }

  const cellW = atlas.cellW ?? 540;
  const cellH = atlas.cellH ?? 810;
  return {
    maxWidth: cellW / ratio,
    maxHeight: cellH / ratio,
  };
}

/** 在宽高约束下取不超过图集 1:1 像素密度的显示尺寸。 */
export function fitAtlasDisplaySize(
  atlas: AtlasCellSize,
  widthLimit: number,
  heightLimit: number,
  aspectRatio: number,
  maxUpscale = 1,
): {width: number; height: number} {
  const {maxWidth, maxHeight} = maxAtlasLogicalSize(atlas);
  const capW = maxWidth * Math.max(1, maxUpscale);
  const capH = maxHeight * Math.max(1, maxUpscale);
  let width = Math.min(widthLimit, capW, heightLimit * aspectRatio);
  let height = width / aspectRatio;
  if (height > Math.min(heightLimit, capH)) {
    height = Math.min(heightLimit, capH);
    width = height * aspectRatio;
  }
  return {width, height};
}
