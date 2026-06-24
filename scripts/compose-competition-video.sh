#!/usr/bin/env bash
# Catune 参赛片 · 分段合成
#
# 列出段落:
#   python3 scripts/compose-competition-video.py list
#
# 只生成某一段 (例: 第一次猫动):
#   python3 scripts/compose-competition-video.py build 03_cat1
#
# 微调第一次猫动: 编辑 mp4/segments/config/03_cat1.json 后重跑 build
#
# 全部段落生成:
#   python3 scripts/compose-competition-video.py build --all
#
# 合并已生成段落:
#   python3 scripts/compose-competition-video.py merge
#
# 一键全量 (生成 + 合并):
#   python3 scripts/compose-competition-video.py all

set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/compose-competition-video.py "$@"
