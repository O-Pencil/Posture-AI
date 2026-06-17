/**
 * @file gen-frame-manifest.mjs
 * @description 扫描 public/frames/<axis>/ 下的帧图，生成 src/ui/assets/<axis>Frames.ts 的 require 清单。
 *   Metro 要求 require 路径是静态字面量，所以帧清单必须落成代码而非运行时读目录。
 *
 * 用法：
 *   node scripts/gen-frame-manifest.mjs           # 默认 axis=lean
 *   node scripts/gen-frame-manifest.mjs neck      # 生成脖子轴清单（public/frames/neck → neckFrames.ts）
 *
 * [HERE] scripts/gen-frame-manifest.mjs · 帧清单生成器
 */
import {existsSync, lstatSync, readdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const axis = process.argv[2] || 'lean';
const framesDir = join(root, 'public', 'frames', axis);
const outFile = join(root, 'src', 'ui', 'assets', `${axis}Frames.ts`);
const constName = `${axis.toUpperCase()}_FRAMES`;

if (!existsSync(framesDir)) {
  console.error(`✗ 帧目录不存在：${framesDir}\n  先用 ffmpeg 切帧到该目录再运行本脚本。`);
  process.exit(1);
}

const allFiles = readdirSync(framesDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
const hasLeanStage = axis === 'lean' && allFiles.some(f => /^lean_stage_\d+\.png$/i.test(f));
const files = allFiles
  .filter(f => {
    // lean_stage_* 为主文件名；lean_* 仅作 Metro 旧 bundle 兼容软链，不进入 manifest
    if (hasLeanStage) {
      return /^lean_stage_\d+\.png$/i.test(f);
    }
    return !/^lean_stage_\d+\.png$/i.test(f);
  })
  .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

/** 010c6de 起帧图改为 lean_stage_*；旧 bundle 仍请求 lean_*，补软链避免 Metro 404。 */
function ensureLeanLegacySymlinks(dir, frameFiles) {
  if (axis !== 'lean') {
    return 0;
  }
  let linked = 0;
  for (const file of frameFiles) {
    const match = file.match(/^lean_stage_(\d+)\.png$/i);
    if (!match) {
      continue;
    }
    const legacyName = `lean_${match[1]}.png`;
    const legacyPath = join(dir, legacyName);
    try {
      if (existsSync(legacyPath)) {
        const stat = lstatSync(legacyPath);
        if (stat.isSymbolicLink()) {
          unlinkSync(legacyPath);
        } else if (!stat.isFile()) {
          continue;
        } else {
          // 真实旧文件已存在则跳过，避免覆盖
          continue;
        }
      }
      symlinkSync(file, legacyPath);
      linked += 1;
    } catch (err) {
      console.warn(`⚠ 无法创建兼容软链 ${legacyName}: ${err.message}`);
    }
  }
  return linked;
}

if (files.length === 0) {
  console.error(`✗ ${framesDir} 下没有图片帧。`);
  process.exit(1);
}

const requires = files.map(f => `  require('../../../public/frames/${axis}/${f}'),`).join('\n');
const block = `// AUTO-GENERATED-FRAMES-START\nexport const ${constName}: ImageSourcePropType[] = [\n${requires}\n];\n// AUTO-GENERATED-FRAMES-END`;

if (!existsSync(outFile)) {
  console.error(`✗ 目标文件不存在：${outFile}（请先创建 ${axis}Frames.ts 的骨架）`);
  process.exit(1);
}

const src = readFileSync(outFile, 'utf8');
const replaced = src.replace(
  /\/\/ AUTO-GENERATED-FRAMES-START[\s\S]*?\/\/ AUTO-GENERATED-FRAMES-END/,
  block,
);
writeFileSync(outFile, replaced, 'utf8');
const legacyLinks = ensureLeanLegacySymlinks(framesDir, files);
console.log(`✓ 写入 ${files.length} 帧到 ${outFile}（${constName}）`);
if (legacyLinks > 0) {
  console.log(`✓ 已创建 ${legacyLinks} 条 lean_*.png → lean_stage_*.png 兼容软链（供旧 bundle / Metro 资源请求）`);
}
