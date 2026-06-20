#!/usr/bin/env bash
# @file run-sme2-min.sh
# @description 最小 SME2 兜底镜头：Docker(linux/arm64) + GCC14 + QEMU10+，
#   A 原生(M2→SME2:no) vs B qemu -cpu max(模拟→SME2:yes + smstart/smstop OK)。
#
# 用法：
#   bash scripts/sme2-demo/pull-base-image.sh 25.04   # Hub 超时先拉镜像
#   bash scripts/sme2-demo/run-sme2-min.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
QEMU_CPU="${QEMU_CPU:-max}"
UBUNTU_VERSION="${UBUNTU_VERSION:-25.04}"

echo "==> 构建镜像（linux/arm64, ubuntu:${UBUNTU_VERSION}）"
docker build --platform=linux/arm64 \
  --build-arg UBUNTU_VERSION="${UBUNTU_VERSION}" \
  -t catune-sme2 "$HERE"

echo "==> 编译 + 原生/模拟 对比"
docker run --rm --platform=linux/arm64 \
  -v "$HERE":/src:ro \
  -e QEMU_CPU="$QEMU_CPU" \
  catune-sme2 bash -lc '
set -e
echo "=== 工具链 ==="
gcc-14 --version | head -1
qemu-aarch64 --version | head -1

echo "=== qemu -cpu help (sme/sme2) ==="
qemu-aarch64 -cpu help 2>&1 | grep -iE "\bsme2?\b" || echo "(help 未列出 — 以 HWCAP2 为准)"

bash /src/compile_sme2_min.sh /src/sme2_min.c /tmp/sme2_min

echo "=== A) 原生执行（M2 容器 arm64，预期 SME2: no） ==="
/tmp/sme2_min || true

echo "=== B) qemu -cpu '"${QEMU_CPU}"' 执行（预期 SME2: yes + 指令 OK） ==="
qemu-aarch64 -cpu '"${QEMU_CPU}"' /tmp/sme2_min
'
echo "==> 完成。录制重点：A SME2:no → B SME2:yes + smstart/smstop executed OK。"
