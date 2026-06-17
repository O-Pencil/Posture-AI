/**
 * @file leanFrames.ts
 * @description 左右倾（lumbar）轴的猫旋转帧清单。由 scripts/gen-frame-manifest.mjs 从 public/frames/lean/ 自动生成。
 *   空数组时 DeskScreen 自动回退到 portal.png 静态图，不破坏构建。
 *
 * 生成步骤见 DeskScreen 顶部说明：先 ffmpeg 切帧，再 `node scripts/gen-frame-manifest.mjs`。
 *
 * [WHO] 导出 `LEAN_FRAMES`（有序 require 帧数组）
 * [FROM] public/frames/lean/*.png（构建期由 Metro 静态打包）
 * [TO] 被 DeskScreen 传给 CatFlipbook
 * [HERE] src/ui/assets/leanFrames.ts · 左右倾帧清单（自动生成）
 */
import type {ImageSourcePropType} from 'react-native';

// AUTO-GENERATED-FRAMES-START
export const LEAN_FRAMES: ImageSourcePropType[] = [
  require('../../../public/frames/lean/lean_stage_0001.png'),
  require('../../../public/frames/lean/lean_stage_0002.png'),
  require('../../../public/frames/lean/lean_stage_0003.png'),
  require('../../../public/frames/lean/lean_stage_0004.png'),
  require('../../../public/frames/lean/lean_stage_0005.png'),
  require('../../../public/frames/lean/lean_stage_0006.png'),
  require('../../../public/frames/lean/lean_stage_0007.png'),
  require('../../../public/frames/lean/lean_stage_0008.png'),
  require('../../../public/frames/lean/lean_stage_0009.png'),
  require('../../../public/frames/lean/lean_stage_0010.png'),
  require('../../../public/frames/lean/lean_stage_0011.png'),
  require('../../../public/frames/lean/lean_stage_0012.png'),
  require('../../../public/frames/lean/lean_stage_0013.png'),
  require('../../../public/frames/lean/lean_stage_0014.png'),
  require('../../../public/frames/lean/lean_stage_0015.png'),
  require('../../../public/frames/lean/lean_stage_0016.png'),
  require('../../../public/frames/lean/lean_stage_0017.png'),
  require('../../../public/frames/lean/lean_stage_0018.png'),
  require('../../../public/frames/lean/lean_stage_0019.png'),
  require('../../../public/frames/lean/lean_stage_0020.png'),
  require('../../../public/frames/lean/lean_stage_0021.png'),
  require('../../../public/frames/lean/lean_stage_0022.png'),
  require('../../../public/frames/lean/lean_stage_0023.png'),
  require('../../../public/frames/lean/lean_stage_0024.png'),
  require('../../../public/frames/lean/lean_stage_0025.png'),
  require('../../../public/frames/lean/lean_stage_0026.png'),
  require('../../../public/frames/lean/lean_stage_0027.png'),
  require('../../../public/frames/lean/lean_stage_0028.png'),
  require('../../../public/frames/lean/lean_stage_0029.png'),
  require('../../../public/frames/lean/lean_stage_0030.png'),
  require('../../../public/frames/lean/lean_stage_0031.png'),
  require('../../../public/frames/lean/lean_stage_0032.png'),
  require('../../../public/frames/lean/lean_stage_0033.png'),
  require('../../../public/frames/lean/lean_stage_0034.png'),
  require('../../../public/frames/lean/lean_stage_0035.png'),
  require('../../../public/frames/lean/lean_stage_0036.png'),
  require('../../../public/frames/lean/lean_stage_0037.png'),
  require('../../../public/frames/lean/lean_stage_0038.png'),
  require('../../../public/frames/lean/lean_stage_0039.png'),
  require('../../../public/frames/lean/lean_stage_0040.png'),
  require('../../../public/frames/lean/lean_stage_0041.png'),
  require('../../../public/frames/lean/lean_stage_0042.png'),
  require('../../../public/frames/lean/lean_stage_0043.png'),
  require('../../../public/frames/lean/lean_stage_0044.png'),
  require('../../../public/frames/lean/lean_stage_0045.png'),
  require('../../../public/frames/lean/lean_stage_0046.png'),
  require('../../../public/frames/lean/lean_stage_0047.png'),
  require('../../../public/frames/lean/lean_stage_0048.png'),
  require('../../../public/frames/lean/lean_stage_0049.png'),
  require('../../../public/frames/lean/lean_stage_0050.png'),
  require('../../../public/frames/lean/lean_stage_0051.png'),
  require('../../../public/frames/lean/lean_stage_0052.png'),
  require('../../../public/frames/lean/lean_stage_0053.png'),
  require('../../../public/frames/lean/lean_stage_0054.png'),
  require('../../../public/frames/lean/lean_stage_0055.png'),
  require('../../../public/frames/lean/lean_stage_0056.png'),
  require('../../../public/frames/lean/lean_stage_0057.png'),
  require('../../../public/frames/lean/lean_stage_0058.png'),
  require('../../../public/frames/lean/lean_stage_0059.png'),
  require('../../../public/frames/lean/lean_stage_0060.png'),
];
// AUTO-GENERATED-FRAMES-END
