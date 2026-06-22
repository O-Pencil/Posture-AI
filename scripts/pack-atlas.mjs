/**
 * @file pack-atlas.mjs
 * @description 把 public/frames/<axis>/ 的帧打包成一张雪碧图 public/atlas/<axis>_atlas.png，并把 cols/rows/count/cellW/cellH/source
 *   写回 src/ui/assets/<axis>Atlas.ts。网格行优先（与 CatSprite 的 col=i%cols 一致）。
 *
 * 清晰度：默认用源帧原始分辨率（如 540×810），避免缩到 320×480 后在 2–3x 真机上二次放大发糊。
 * 纹理上限：旗舰机常见 8192；老设备 4096 请用较小单格，例如 lean 360 540 8。
 *
 * 用法（在装了 ffmpeg 的机器上）：
 *   node scripts/pack-atlas.mjs                  # 默认 axis=lean，自动读源帧尺寸
 *   node scripts/pack-atlas.mjs lean             # 全分辨率 + 自动列数
 *   node scripts/pack-atlas.mjs lean 360 540 8   # 兼容 4096 纹理的降采样版
 * 没装 ffmpeg：脚本只打印手动命令，不改 meta（避免指向不存在的图集）。
 *
 * [HERE] scripts/pack-atlas.mjs · 雪碧图打包 + meta 回写
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const axis = process.argv[2] || 'lean';
const argCellW = process.argv[3] ? Number(process.argv[3]) : null;
const argCellH = process.argv[4] ? Number(process.argv[4]) : null;
const argCols = process.argv[5] ? Number(process.argv[5]) : null;

const framesDir = join(root, 'public', 'frames', axis);
const atlasDir = join(root, 'public', 'atlas');
const atlasPath = join(atlasDir, `${axis}_atlas.png`);
const metaFile = join(root, 'src', 'ui', 'assets', `${axis}Atlas.ts`);
const constName = `${axis.toUpperCase()}_ATLAS`;
const TEX_LIMIT = 8192;

/** 从 PNG IHDR 读宽高（不依赖额外库）。 */
function readPngSize(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }
  return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

/** 在纹理上限内选列数：优先更宽网格（行数更少、总高度更低）。 */
function pickCols(count, cellW, cellH, maxTex = TEX_LIMIT) {
  let best = 8;
  for (let c = 4; c <= 12; c += 1) {
    const rows = Math.ceil(count / c);
    const atlasW = c * cellW;
    const atlasH = rows * cellH;
    if (atlasW <= maxTex && atlasH <= maxTex) {
      best = c;
    }
  }
  return best;
}

if (!existsSync(framesDir)) {
  console.error(`✗ 帧目录不存在：${framesDir}\n  先用 ffmpeg 切帧（见 DeskScreen 顶部说明）。`);
  process.exit(1);
}

const all = readdirSync(framesDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
const stageFiles = all.filter(f => /_stage_\d+\.(png|jpg|jpeg|webp)$/i.test(f));
const files = (stageFiles.length > 0 ? stageFiles : all.filter(f => !/^lean_\d+\.png$/i.test(f))).sort((a, b) =>
  a.localeCompare(b, undefined, {numeric: true}),
);
const count = files.length;
if (count < 2) {
  console.error(`✗ ${framesDir} 帧数不足（${count}）。`);
  process.exit(1);
}

const firstSize = readPngSize(join(framesDir, files[0]));
const cellW = argCellW ?? firstSize?.width ?? 540;
const cellH = argCellH ?? firstSize?.height ?? 810;
const cols = argCols ?? pickCols(count, cellW, cellH);
const rows = Math.ceil(count / cols);
const atlasW = cols * cellW;
const atlasH = rows * cellH;

if (atlasW > TEX_LIMIT || atlasH > TEX_LIMIT) {
  console.warn(
    `⚠ 图集 ${atlasW}×${atlasH} 超过 ${TEX_LIMIT}。\n` +
      `  建议：node scripts/pack-atlas.mjs ${axis} 360 540 8  （4096 兼容）`,
  );
}

const sample = files[0];
const m = sample.match(/^(.*?)(\d+)(\D*)$/);
const pattern = m ? `${m[1]}%0${m[2].length}d${m[3]}` : sample;
const startNumber = m ? String(Number(m[2])) : '1';

const ffmpegArgs = [
  '-y',
  '-start_number',
  startNumber,
  '-i',
  join(framesDir, pattern),
  '-frames:v',
  '1',
  '-update',
  '1',
  '-vf',
  `scale=${cellW}:${cellH}:flags=lanczos,tile=${cols}x${rows}`,
  atlasPath,
];
const cmdStr = `ffmpeg ${ffmpegArgs.map(a => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`;

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], {stdio: 'ignore'}).status === 0;
if (!hasFfmpeg) {
  console.log(
    `ℹ 未检测到 ffmpeg。请手动运行下面命令打包，再重跑本脚本写 meta：\n\n  mkdir -p ${atlasDir}\n  ${cmdStr}\n`,
  );
  console.log(`（网格：${cols}×${rows}，单格 ${cellW}×${cellH}，共 ${count} 帧）`);
  process.exit(0);
}

mkdirSync(atlasDir, {recursive: true});
const run = spawnSync('ffmpeg', ffmpegArgs, {stdio: 'inherit'});
if (run.status !== 0 || !existsSync(atlasPath)) {
  console.error('✗ ffmpeg 打包失败，meta 未改动。');
  process.exit(1);
}

if (!existsSync(metaFile)) {
  console.error(`✗ meta 文件不存在：${metaFile}`);
  process.exit(1);
}
const block =
  `// AUTO-GENERATED-ATLAS-START\n` +
  `export const ${constName}: AtlasMeta = {\n` +
  `  source: require('../../../public/atlas/${axis}_atlas.png'),\n` +
  `  cols: ${cols},\n` +
  `  rows: ${rows},\n` +
  `  count: ${count},\n` +
  `  cellW: ${cellW},\n` +
  `  cellH: ${cellH},\n` +
  `};\n` +
  `// AUTO-GENERATED-ATLAS-END`;
const src = readFileSync(metaFile, 'utf8');
const replaced = src.replace(
  /\/\/ AUTO-GENERATED-ATLAS-START[\s\S]*?\/\/ AUTO-GENERATED-ATLAS-END/,
  block,
);
writeFileSync(metaFile, replaced, 'utf8');
console.log(
  `✓ 打包 ${count} 帧 → ${atlasPath}（${cols}×${rows}，单格 ${cellW}×${cellH}，图集 ${atlasW}×${atlasH}）\n` +
    `  meta → ${metaFile}`,
);
