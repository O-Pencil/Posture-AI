#!/usr/bin/env bash
# 从 DaoCloud 镜像站拉 Ubuntu 基座（Docker Hub 超时时用）。
# 用法：bash scripts/sme2-demo/pull-base-image.sh [25.04]
set -euo pipefail
TAG="${1:-25.04}"
SRC="docker.m.daocloud.io/library/ubuntu:${TAG}"
DST="ubuntu:${TAG}"
echo "==> pull ${SRC}"
docker pull "${SRC}"
docker tag "${SRC}" "${DST}"
echo "==> tagged ${DST}"
docker images | grep -E "ubuntu.*${TAG}" || true
