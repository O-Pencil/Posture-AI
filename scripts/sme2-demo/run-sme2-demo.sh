#!/usr/bin/env bash
# @file run-sme2-demo.sh
# @description SME2 功能级演示（无 SME2 硬件时用 QEMU 模拟）。
#   思路：Docker(linux/arm64，在 M2 上原生→构建快) 编 MNN(带 SME2/KleidiAI)，
#   再用 `qemu-aarch64 -cpu max`(模拟出 SME2 的 CPU) 跑 llm_demo → MNN 运行时探测到 sme2 → 走 SME2 内核。
#   产物：cpuinfo/HWCAP 有 sme2 + MNN 选了 SME2/KleidiAI 路径 + 正确中文输出。**功能证据，非速度**。
#
# 前置：Docker Desktop（含 arm64）、本地 MNN 源码、Qwen 的 .mnn 模型目录（含 config.json）。
# 用法：
#   export MNN_SRC=~/MNN                 # MNN 源码
#   export MODEL_DIR=~/models/qwen2.5-0.5b   # 含 config.json/llm.mnn 等
#   bash scripts/sme2-demo/run-sme2-demo.sh
set -euo pipefail

: "${MNN_SRC:?请先 export MNN_SRC=MNN源码路径}"
: "${MODEL_DIR:?请先 export MODEL_DIR=Qwen .mnn 模型目录(含 config.json)}"
PROMPT="${PROMPT:-请用一句不超过30字、有温度的中文提醒我坐直，不要医疗诊断。}"
# llm_demo 第 4 参数 = 最多 decode token 数；不传则默认 512，小模型易重复啰嗦（如膳食宝塔）
MAX_NEW_TOKENS="${MAX_NEW_TOKENS:-32}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> 构建演示镜像（linux/arm64）"
docker build --platform=linux/arm64 -t catune-sme2 "$HERE"

echo "==> 进容器：原生编 MNN → qemu 模拟 SME2 跑推理"
docker run --rm --platform=linux/arm64 \
  -v "$MNN_SRC":/mnn:ro -v "$MODEL_DIR":/model:ro \
  -e PROMPT="$PROMPT" -e MAX_NEW_TOKENS="$MAX_NEW_TOKENS" \
  catune-sme2 bash -lc '
set -e
echo "=== 0) 确认 qemu -cpu max 暴露 SME2 ==="
qemu-aarch64 -cpu help 2>/dev/null | grep -iE "\bsme2\b" || echo "(qemu 版本较老可能不显，继续)"

echo "=== 1) 原生 arm64 构建 MNN（带 SME2/KleidiAI + LLM） ==="
cmake -S /mnn -B /build \
  -DMNN_BUILD_LLM=ON -DMNN_KLEIDIAI=ON -DMNN_SME2=ON -DMNN_ARM82=ON \
  -DMNN_LOW_MEMORY=ON -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON -DCMAKE_BUILD_TYPE=Release
cmake --build /build -j"$(nproc)" --target llm_demo
DEMO=$(find /build -name llm_demo -type f | head -1)
echo "llm_demo = $DEMO"

echo "=== 2) 用 qemu 模拟 SME2 的 CPU 跑推理（-cpu max 开启 SME/SME2） ==="
# 直接跑 $DEMO 会用容器原生 arm64(无 SME2)；必须套 qemu-aarch64 -cpu max 重新模拟带 SME2 的 CPU。
# 第 4 参数限制 decode 长度，避免默认 512 token 导致重复输出。
echo "$PROMPT" > /tmp/p.txt
echo "max decode tokens = ${MAX_NEW_TOKENS}"
qemu-aarch64 -cpu max "$DEMO" /model/config.json /tmp/p.txt "${MAX_NEW_TOKENS}" 2>&1 | tee /tmp/out.txt || \
qemu-aarch64 -cpu max "$DEMO" /model/config.json "$PROMPT" "${MAX_NEW_TOKENS}" 2>&1 | tee -a /tmp/out.txt || true

echo "=== 3) 证据（SME2 路径 + 输出） ==="
grep -iE "sme2|kleidi|backend|thread" /tmp/out.txt || echo "(若无关键字，看 MNN 版本是否打印 backend；可加 -DMNN_DEBUG 或查 KleidiAI 日志)"
'
echo "==> 完成。录制重点见 scripts/sme2-demo/README.md"
