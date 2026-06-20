# SME2 功能级演示镜像（linux/arm64）。
# 在 Apple Silicon 上 Docker 原生 arm64 运行 → MNN 编译快；
# SME2 特性由容器内 qemu-user 的 `-cpu max` 模拟（M2 硬件无 SME2）。
#
# 需要 GCC 14（+sme/+sme2 march）与 QEMU 10+（linux-user 暴露 HWCAP2_SME2）。
# Ubuntu 24.04 自带 GCC 13 + QEMU 8.x，实测 sme2:0 —— 故默认基座改为 25.04。
ARG UBUNTU_VERSION=25.04
FROM ubuntu:${UBUNTU_VERSION}

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc-14 g++-14 make cmake git ca-certificates \
    qemu-user binutils file \
    && rm -rf /var/lib/apt/lists/* \
    && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 100 \
    && update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-14 100

ENV CC=gcc-14 CXX=g++-14

# 构建时打印工具链版本，便于录屏/排障
RUN echo "=== toolchain ===" \
    && gcc-14 --version | head -1 \
    && qemu-aarch64 --version | head -1 \
    && (qemu-aarch64 -cpu help 2>&1 | grep -iE 'sme2|sme' | head -5 || echo "(cpu help 未列出 sme — 运行时再验 HWCAP2)")

WORKDIR /work
