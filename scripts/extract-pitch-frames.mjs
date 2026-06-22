/**
 * @file extract-pitch-frames.mjs
 * @description 从 cat-top-bottom.mp4 切俯仰帧：3–5s（抬头→低头），缩放到与 lean 一致的 540×810，
 *   colorkey 去背景为 RGBA 透明底（与 lean_stage_* 相同规格）。
 *
 * 用法：
 *   node scripts/extract-pitch-frames.mjs
 *   node scripts/extract-pitch-frames.mjs --pack   # 切帧后顺带 manifest + atlas
 *
 * [HERE] scripts/extract-pitch-frames.mjs
 */
import {existsSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const CELL_W = 540;
const CELL_H = 810;
const VIDEO = join(root, 'public', 'mp4', 'cat-top-bottom.mp4');
const OUT_DIR = join(root, 'public', 'frames', 'pitch');
const OUT_PATTERN = join(OUT_DIR, 'pitch_stage_%04d.png');

/** 与 lean 帧一致：浅灰底 → 透明。相似度/混合可按素材微调。 */
const COLORKEY = '0xEAEAEA:0.10:0.06';
const VF = `scale=${CELL_W}:${CELL_H}:flags=lanczos,colorkey=${COLORKEY},format=rgba`;

const withPack = process.argv.includes('--pack');

if (!existsSync(VIDEO)) {
  console.error(`✗ 视频不存在：${VIDEO}`);
  process.exit(1);
}

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], {stdio: 'ignore'}).status === 0;
if (!hasFfmpeg) {
  console.error('✗ 需要 ffmpeg。');
  process.exit(1);
}

mkdirSync(OUT_DIR, {recursive: true});

const extract = spawnSync(
  'ffmpeg',
  ['-y', '-i', VIDEO, '-ss', '3', '-t', '2', '-vsync', '0', '-vf', VF, OUT_PATTERN],
  {stdio: 'inherit'},
);

if (extract.status !== 0) {
  console.error('✗ 切帧失败');
  process.exit(1);
}

console.log(`✓ 俯仰帧 → ${OUT_DIR}/pitch_stage_*.png（${CELL_W}×${CELL_H} RGBA 透明底）`);

if (withPack) {
  const manifest = spawnSync('node', ['scripts/gen-frame-manifest.mjs', 'pitch'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (manifest.status !== 0) {
    process.exit(manifest.status ?? 1);
  }
  const pack = spawnSync('node', ['scripts/pack-atlas.mjs', 'pitch', '540', '810', '10'], {
    cwd: root,
    stdio: 'inherit',
  });
  process.exit(pack.status ?? 0);
}
