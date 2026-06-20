#!/usr/bin/env bash
# @file run-sme2-demo.sh
# @description SME2 功能级演示：Docker 编 MNN(SME2/KleidiAI) → qemu -cpu max 跑 llm_demo。
#
# 用法：
#   export MNN_SRC=$PWD/android/app/src/main/cpp/third_party/MNN
#   export MODEL_DIR=$PWD/MNN/qwen2.5-0.5b
#   bash scripts/sme2-demo/run-sme2-demo.sh
#
# 环境变量：
#   MAX_NEW_TOKENS=24      限制 decode，避免 512 token 重复
#   BUILD_CACHE=路径         持久化 /build，避免每次重编 MNN（默认 .docker-mnn-build）
#   SKIP_MNN_BUILD=1       跳过 cmake（/build 里已有 llm_demo 时）
#   UBUNTU_VERSION=25.04   基座版本（需 GCC14 + QEMU10+）
#   QEMU_CPU=max           qemu CPU 模型
set -euo pipefail

: "${MNN_SRC:?请先 export MNN_SRC=MNN源码路径}"
: "${MODEL_DIR:?请先 export MODEL_DIR=Qwen .mnn 模型目录(含 config.json)}"
PROMPT="${PROMPT:-请用一句不超过30字、有温度的中文提醒我坐直，不要医疗诊断。}"
MAX_NEW_TOKENS="${MAX_NEW_TOKENS:-32}"
QEMU_CPU="${QEMU_CPU:-max}"
UBUNTU_VERSION="${UBUNTU_VERSION:-25.04}"
SKIP_MNN_BUILD="${SKIP_MNN_BUILD:-0}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD_CACHE="${BUILD_CACHE:-$HERE/.docker-mnn-build}"
mkdir -p "$BUILD_CACHE"

echo "==> 构建演示镜像（linux/arm64, ubuntu:${UBUNTU_VERSION}）"
docker build --platform=linux/arm64 \
  --build-arg UBUNTU_VERSION="${UBUNTU_VERSION}" \
  -t catune-sme2 "$HERE"

echo "==> 进容器：编 MNN（可缓存）→ qemu 模拟 SME2 推理"
docker run --rm --platform=linux/arm64 \
  -v "$MNN_SRC":/mnn:ro \
  -v "$MODEL_DIR":/model:ro \
  -v "$BUILD_CACHE":/build \
  -e PROMPT="$PROMPT" \
  -e MAX_NEW_TOKENS="$MAX_NEW_TOKENS" \
  -e SKIP_MNN_BUILD="$SKIP_MNN_BUILD" \
  -e QEMU_CPU="$QEMU_CPU" \
  catune-sme2 bash -lc '
set -e
echo "=== 0) 工具链 + qemu SME2 ==="
gcc-14 --version | head -1
qemu-aarch64 --version | head -1
qemu-aarch64 -cpu help 2>&1 | grep -iE "\bsme2\b" || echo "(help 未列出 sme2 — 看 MNN sme2:0/1)"

if [ "${SKIP_MNN_BUILD}" != "1" ]; then
  echo "=== 1) 原生 arm64 构建 MNN（SME2/KleidiAI + LLM） ==="
  cmake -S /mnn -B /build \
    -DCMAKE_C_COMPILER=gcc-14 -DCMAKE_CXX_COMPILER=g++-14 \
    -DMNN_BUILD_LLM=ON -DMNN_KLEIDIAI=ON -DMNN_SME2=ON -DMNN_ARM82=ON \
    -DMNN_LOW_MEMORY=ON -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON -DCMAKE_BUILD_TYPE=Release
  cmake --build /build -j"$(nproc)" --target llm_demo
else
  echo "=== 1) 跳过编译（SKIP_MNN_BUILD=1） ==="
fi

DEMO=$(find /build -name llm_demo -type f | head -1)
if [ -z "$DEMO" ]; then
  echo "ERROR: 未找到 llm_demo，请去掉 SKIP_MNN_BUILD 或检查 BUILD_CACHE"
  exit 1
fi
echo "llm_demo = $DEMO"

echo "=== 2) qemu -cpu ${QEMU_CPU} 跑推理 ==="
echo "$PROMPT" > /tmp/p.txt
echo "max decode tokens = ${MAX_NEW_TOKENS}"
qemu-aarch64 -cpu "${QEMU_CPU}" "$DEMO" /model/config.json /tmp/p.txt "${MAX_NEW_TOKENS}" 2>&1 | tee /tmp/out.txt || \
qemu-aarch64 -cpu "${QEMU_CPU}" "$DEMO" /model/config.json "$PROMPT" "${MAX_NEW_TOKENS}" 2>&1 | tee -a /tmp/out.txt || true

echo "=== 3) 证据 ==="
grep -iE "device supports|sme2|kleidi|backend" /tmp/out.txt || echo "(若无 sme2:1，见 README 排障)"
'
echo "==> 完成。BUILD_CACHE=$BUILD_CACHE（下次可 SKIP_MNN_BUILD=1 只跑推理）"
