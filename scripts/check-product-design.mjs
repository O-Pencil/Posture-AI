#!/usr/bin/env node
/**
 * Product-design guardrails for Catune.
 *
 * These checks encode mechanical parts of the repo-local product design
 * practice. Judgment stays in .agents/skills/catune-product-design/references.
 */
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, extname} from 'node:path';

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (path.includes('node_modules')) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const forbiddenDirs = ['PRD', 'prototype', 'web', 'src/ui'];
for (const dir of forbiddenDirs) {
  if (existsSync(dir)) fail(`Forbidden legacy directory exists: ${dir}`);
}

const requiredFiles = [
  '.agents/skills/catune-product-design/SKILL.md',
  '.agents/skills/catune-product-design/AGENTS.md',
  '.agents/skills/catune-product-design/references/product-judgment.md',
  '.agents/skills/catune-product-design/references/interface-quality.md',
  '.agents/skills/catune-product-design/references/copy.md',
  '.agents/skills/catune-product-design/references/surfaces.md',
  '.agents/skills/catune-product-design/references/rules.md',
  '.agents/skills/catune-product-design/references/glossary.md',
  '.agents/skills/catune-product-design/references/patterns.md',
  '.agents/skills/catune-product-design/references/coverage-gaps.md',
  '.agents/skills/catune-product-design/references/review-loop.md',
  '.agents/skills/catune-product-design/references/decision-template.md',
];
for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`Missing product-design file: ${file}`);
}

const sourceFiles = [
  ...walk('src'),
  ...walk('scripts'),
].filter(file => ['.md', '.ts', '.tsx', '.mjs'].includes(extname(file)) || file.endsWith('AGENTS.md'));

const stalePathPattern = /\b(?:PRD|prototype|web|src\/ui)\//;
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  if (stalePathPattern.test(text)) {
    fail(`Stale legacy path reference in ${file}`);
  }
}

const designFiles = walk('src/design').filter(file => ['.ts', '.tsx'].includes(extname(file)));
const forbiddenUiImports = [
  'expo-sensors',
  'react-native-ble-plx',
  'expo-file-system',
  'NativeModules',
];
for (const file of designFiles) {
  const text = readFileSync(file, 'utf8');
  for (const needle of forbiddenUiImports) {
    if (text.includes(needle)) {
      fail(`Platform/native dependency "${needle}" appears in UI file ${file}`);
    }
  }
  if (/\bclassName\s*=/.test(text)) {
    fail(`className appears in UI file ${file}; use src/design primitives/theme instead`);
  }
  if (/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/.test(text) || /<Modal\b/.test(text)) {
    fail(`React Native Modal appears in ${file}; use existing screen overlay patterns unless a decision record accepts a modal`);
  }
  if (/\bPicker\b|<select\b|<Select\b/.test(text)) {
    fail(`Picker/select-like control appears in ${file}; prefer SegmentedControl/Chip for small static option sets`);
  }
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (!line.includes('<Pressable')) return;
    if (line.includes('accessibilityLabel') || line.includes('accessibilityRole')) return;
    if (line.includes('StyleSheet.absoluteFill')) return;
    warn(`Pressable may need an accessible name/role: ${file}:${index + 1}`);
  });
}

if (warnings.length && process.env.CATUNE_SHOW_DESIGN_WARNINGS === '1') {
  console.warn('Product design warnings:');
  for (const w of warnings.slice(0, 30)) console.warn(`- ${w}`);
  if (warnings.length > 30) console.warn(`- ... ${warnings.length - 30} more`);
}

if (failures.length) {
  console.error('Product design checks failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('Product design checks passed.');
