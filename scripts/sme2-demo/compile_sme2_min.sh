#!/usr/bin/env bash
# 在容器内编译 sme2_min.c；供 run-sme2-min.sh 调用。
set -euo pipefail
SRC="${1:?source .c path}"
OUT="${2:-/tmp/sme2_min}"
CC="${CC:-gcc-14}"

try_march() {
  local march="$1"
  if "${CC}" -O2 -march="${march}" "${SRC}" -o "${OUT}" 2>/tmp/cc.log; then
    echo "[ok] ${CC} -march=${march}"
    return 0
  fi
  return 1
}

echo "=== 编译 ${CC} $( ${CC} -dumpversion ) ==="
for march in armv9.2-a+sme2 armv9.2-a+sme armv9-a+sme; do
  if try_march "${march}"; then
    exit 0
  fi
done

echo "[!] SME march 均失败，退回纯 HWCAP 检测："
tail -5 /tmp/cc.log || true
"${CC}" -O2 "${SRC}" -o "${OUT}"
