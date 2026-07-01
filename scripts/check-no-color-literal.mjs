#!/usr/bin/env node
/**
 * Warn-only color literal scan for src/design.
 *
 * This is intentionally non-blocking: it gives agents a quick smell report
 * without preventing work while the legacy color surface is being reduced.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {extname, join} from 'node:path';

const ROOT = 'src/design';
const EXTS = new Set(['.ts', '.tsx']);
const ALLOWED_FILES = new Set(['src/design/theme/colors.ts']);
const COLOR_RE = /(?:#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
const findings = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, out);
    } else if (EXTS.has(extname(path))) {
      out.push(path);
    }
  }
  return out;
}

for (const file of walk(ROOT)) {
  if (ALLOWED_FILES.has(file)) {
    continue;
  }
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes('eslint-disable') || line.includes('color-literal-ok')) {
      return;
    }
    const matches = line.match(COLOR_RE);
    if (matches) {
      findings.push({file, line: index + 1, matches});
    }
  });
}

if (findings.length === 0) {
  console.log('OK: no design color literals outside theme/colors.ts');
} else {
  console.log(`WARN: ${findings.length} design color literal locations outside theme/colors.ts`);
  for (const finding of findings.slice(0, 20)) {
    console.log(`  ${finding.file}:${finding.line} ${finding.matches.join(', ')}`);
  }
  if (findings.length > 20) {
    console.log(`  ... ${findings.length - 20} more`);
  }
}

process.exit(0);
