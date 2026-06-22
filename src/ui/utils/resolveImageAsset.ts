import {Image, ImageSourcePropType} from 'react-native';

export type ResolvedImageAsset = {
  width?: number;
  height?: number;
  uri?: string;
};

/**
 * RN 原生有 Image.resolveAssetSource；RN Web 上常缺失，require 也可能直接带 width/height。
 */
export function resolveImageAsset(
  source: ImageSourcePropType,
  fallback?: {width?: number; height?: number},
): ResolvedImageAsset | null {
  try {
    const resolve = (Image as typeof Image & {resolveAssetSource?: (s: ImageSourcePropType) => ResolvedImageAsset})
      .resolveAssetSource;
    if (typeof resolve === 'function') {
      const resolved = resolve(source);
      if (resolved?.width && resolved?.height) {
        return resolved;
      }
    }
  } catch {
    // RN Web
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const obj = source as ResolvedImageAsset;
    if (obj.width && obj.height) {
      return obj;
    }
    if (obj.uri) {
      return {...obj, ...fallback};
    }
  }

  if (fallback?.width && fallback?.height) {
    return fallback;
  }
  return null;
}
