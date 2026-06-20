# SME2 功能级演示（无 SME2 硬件 / M2 Pro）

> 目的：在没有 SME2 真机时，用 **Docker + GCC14 + QEMU10+** 尽量拿到 **`sme2:1` / `SME2:yes`** 运行证据。
> **2026-06-20（ubuntu:24.04）**：GCC13 + QEMU8 → A1 仅 `SME:yes`，A2 `sme2:0`。
> **2026-06-21 升级**：默认基座 **ubuntu:25.04** + **gcc-14** + 较新 **qemu-user**（需 HWCAP2_SME2，QEMU 10+ 才完整）。

## 快速开始

### 0. 拉基座镜像（Docker Hub 超时时必做）

```bash
cd ~/Projects/study_daily/Pencil/Posture-AI
bash scripts/sme2-demo/pull-base-image.sh 25.04
# 若 25.04 拉不动，可试：bash scripts/sme2-demo/pull-base-image.sh 24.10
```

### 1. 先跑 A1（~5 分钟，验证 toolchain）

```bash
bash scripts/sme2-demo/run-sme2-min.sh
```

**成功标志（B 段）：**
```
SME2 : yes
SME instruction (smstart/smstop) executed OK
```

### 2. 再跑 A2（首次编 MNN 仍慢；之后可缓存）

```bash
export MNN_SRC="$PWD/android/app/src/main/cpp/third_party/MNN"
export MODEL_DIR="$PWD/MNN/qwen2.5-0.5b"
export MAX_NEW_TOKENS=24

bash scripts/sme2-demo/run-sme2-demo.sh

# 第二次只跑推理（/build 已缓存）：
SKIP_MNN_BUILD=1 bash scripts/sme2-demo/run-sme2-demo.sh
```

**成功标志：**
```
The device supports: ... sme2: 1
```
+ 中文教练输出。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `UBUNTU_VERSION` | `25.04` | Docker 基座；24.04 太旧勿用 |
| `QEMU_CPU` | `max` | qemu CPU 模型 |
| `MAX_NEW_TOKENS` | `32` | llm_demo 第 4 参数 |
| `BUILD_CACHE` | `.docker-mnn-build` | 持久化 MNN 编译目录 |
| `SKIP_MNN_BUILD` | `0` | `1` = 跳过 cmake，只 qemu 推理 |

## 升级原因（24.04 → 25.04）

| 组件 | Ubuntu 24.04 | 需要 |
| --- | --- | --- |
| GCC | 13，无 `+sme2` march | **GCC 14**，`-march=armv9.2-a+sme` |
| QEMU | 8.x，linux-user 不报 HWCAP2_SME2 | **QEMU 10+**（2025-07 起 `-cpu max` 暴露 sme2） |

## 排障

| 现象 | 处理 |
| --- | --- |
| `docker pull ubuntu:25.04` 超时 | `bash scripts/sme2-demo/pull-base-image.sh 25.04` |
| 构建镜像 apt 很慢 | 正常，首次 10–40 分钟；可开录屏从 A1 B 段开始 |
| A1 仍 `SME2:no` | 试 `UBUNTU_VERSION=24.10`；仍失败则 QEMU 仍不够新，见联调 §7.3 |
| A2 重复「膳食宝塔」 | 确认 `MAX_NEW_TOKENS=24` |
| MNN 重编太久 | 用 `BUILD_CACHE` + `SKIP_MNN_BUILD=1` |

## 诚实口径

- QEMU 下 decode ~5 tok/s **不是**真机加速，不能和小米14 ~63 tok/s 对比。
- 若 B 段出现 `sme2:1`，可说「QEMU 模拟 SME2 CPU，MNN 运行时探测通过」；仍应注明是**模拟环境**。
- 真机 `hw sme2=true` 仍是最终验收标准。

详见 [联调进度 §7](../../docs/联调进度与实测记录.md#7-mac-docker-sme2-演示a1a2--2026-06-20)。
