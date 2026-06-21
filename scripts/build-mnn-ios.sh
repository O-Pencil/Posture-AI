#!/usr/bin/env bash
# @file build-mnn-ios.sh
# @description 在 Mac 上编 MNN 的 iOS 静态库，产出到 ios/CatuneMnn/MNN/lib/（供 CatuneMnn.podspec 链接）。
#   头文件不拷贝：podspec 的 HEADER_SEARCH_PATHS 直接指向 MNN 源码（与安卓 CMakeLists 同 4 个 include 路径）。
#   cmake 开关与安卓 libMNN.so 一致（已验证）：MNN_BUILD_LLM/KLEIDIAI/SME2/ARM82/LOW_MEMORY/CPU_WEIGHT_DEQUANT_GEMM。
#
# 用法：
#   export MNN_SRC=$PWD/android/app/src/main/cpp/third_party/MNN   # 与安卓同一份 MNN 源码
#   bash scripts/build-mnn-ios.sh
#
# 注：MNN iOS 构建随版本而异；若某开关报错，可去掉 MNN_SME2/MNN_KLEIDIAI（A18 无 SME2，端侧仍可跑、只少 SME2 内核）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MNN_SRC="${MNN_SRC:?请先 export MNN_SRC=MNN 源码路径（与安卓同一份）}"
OUT="$ROOT/ios/CatuneMnn/MNN"
BUILD="$ROOT/.mnn-ios-build"

[ -d "$MNN_SRC/include/MNN" ] || { echo "✗ 未找到 $MNN_SRC/include/MNN，MNN_SRC 不对"; exit 1; }

echo "==> 配置 MNN iOS（device arm64；开关对齐安卓 libMNN）"
cmake -S "$MNN_SRC" -B "$BUILD" \
  -DCMAKE_SYSTEM_NAME=iOS \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=15.1 \
  -DCMAKE_BUILD_TYPE=Release \
  -DMNN_BUILD_SHARED_LIBS=OFF \
  -DMNN_SEP_BUILD=OFF \
  -DMNN_AAPL_FMWK=OFF \
  -DMNN_METAL=OFF \
  -DMNN_BUILD_LLM=ON \
  -DMNN_KLEIDIAI=ON \
  -DMNN_SME2=ON \
  -DMNN_ARM82=ON \
  -DMNN_LOW_MEMORY=ON \
  -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON

echo "==> 编译"
cmake --build "$BUILD" --config Release -j"$(sysctl -n hw.ncpu)"

echo "==> 收集静态库 → $OUT/lib"
mkdir -p "$OUT/lib"
found=0
# MNN_SEP_BUILD=OFF 一般合成单个 libMNN.a；保险起见把 MNN/LLM 相关 .a 都收过去
while IFS= read -r a; do cp "$a" "$OUT/lib/"; echo "  + $(basename "$a")"; found=1; done < <(find "$BUILD" -name 'libMNN*.a' -o -name 'libllm*.a')
[ "$found" = 1 ] || { echo "✗ 没找到 libMNN*.a，检查构建日志（可能开关名随 MNN 版本变化）"; exit 1; }

echo "✓ 完成：$OUT/lib/（device arm64）"
echo "  下一步：npx expo prebuild -p ios && cd ios && pod install && cd .. && npx expo run:ios --device"
echo "  注：仅 device arm64；要跑模拟器需 xcframework（device+sim 各编一份）。"
