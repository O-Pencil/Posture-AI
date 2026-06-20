# SME2 功能级演示（无 SME2 硬件 / M2 Pro）

> 目的：在没有 SME2 硬件的电脑上，尝试证明 MNN SME2 适配 + 端侧 LLM 推理。
> **2026-06-20 实测结论**：Mac Docker 可证 **编译开启 SME2 + 中文推理**；**不能**证运行时走 SME2 内核（qemu 仍 `sme2:0`）。
> **这是功能/适配证据，不是速度证据**——QEMU 是模拟，比真机慢，**不能**用来讲"加速 X 倍"。
> 真·加速数字需 SME2 硬件（Arm C1 旗舰 / Apple M4+ 等），口径：「代码已适配，设备就绪即加速」。详见 [联调进度 §7.3](../../docs/联调进度与实测记录.md#73-sme2运行证据怎么办行动清单)。

## 为什么这么做
- SME2 是 Armv9.2+ 硬件特性，无法软件开启；**M2 Pro 无 SME2**（SME 从 M4 起）。
- 理想路径：用 **`qemu-aarch64 -cpu max`** 模拟带 SME2 的 CPU 跑二进制。
- **实测**：Ubuntu 24.04 容器内 GCC 13 不支持 `+sme2` march；`qemu-user` 对 SME2 HWCAP 报不完整 → A1 B 段仅 `SME:yes`，A2 MNN 仍 `sme2:0`。

## 前置
- Docker Desktop（Apple Silicon，含 arm64）
- 本地 MNN 源码：`export MNN_SRC=$PWD/android/app/src/main/cpp/third_party/MNN`
- Qwen 的 `.mnn` 模型目录：`export MODEL_DIR=$PWD/MNN/qwen2.5-0.5b`

## 跑 A2（MNN 全链路）
```bash
export MNN_SRC=$PWD/android/app/src/main/cpp/third_party/MNN
export MODEL_DIR=$PWD/MNN/qwen2.5-0.5b
export MAX_NEW_TOKENS=24   # 必传，否则默认 512 token 易重复啰嗦
bash scripts/sme2-demo/run-sme2-demo.sh
```

## 跑 A1（最小对照，可选）
```bash
bash scripts/sme2-demo/run-sme2-min.sh
```

## 2026-06-20 实测结果摘要

### A1
- A 原生：`SME2:no` ✅
- B qemu：`SME:yes` / `SME2:no` △
- 无 `smstart/smstop executed OK`

### A2（可录屏）
- cmake：`MNN_SME2=ON`、`MNN_KLEIDIAI=ON` ✅
- 输出：「坐起来放松放松，别紧张。」✅
- `sme2: 0`，decode ~5 tok/s（qemu）— **勿称 SME2 加速**

## 录制重点（视频 · 诚实口径）

**可以录：**
1. cmake 日志里 `MNN_SME2=ON / KleidiAI`。
2. `llm_demo` 中文教练输出 + `decode tokens num = 24`。
3. App 内 `lib sme2=true` + 小米14 基准 TPS（NEON 真机性能）。

**不要录/不要说：**
1. 「QEMU 已启用 SME2 内核」（实测 `sme2:0`）。
2. 「A1 证明 SME2 指令执行成功」（GCC/QEMU 未达标）。
3. 用 qemu 5 tok/s 与真机 63 tok/s 做「加速对比」。

**推荐口播：**
> 「MNN 编译已开 SME2/KleidiAI；Mac 上用 Docker+QEMU 跑通 Qwen 端侧中文推理，证明 LLM 链路。当前模拟环境 `sme2:0`，运行时 SME2 需 `hw sme2=true` 真机，届时 MNN 自动选 SME2 内核。」

## 可能要微调的点
- `llm_demo` 第 4 参数 = max decode tokens；脚本默认 `MAX_NEW_TOKENS=32`。
- 容器每次 `--rm` 会重编 MNN（耗时长）；中断需重跑。
- 若要真 SME2 运行证据：借 Arm C1 等真机跑 `llm_bench`，见联调文档 §7.3。

## 兜底镜头（A1）
`sme2_min.c` + `run-sme2-min.sh`：在当前 Docker 环境下**只能**稳定展示 A 段 `SME2:no` 与 B 段 `SME:yes`；**不能**依赖 B 段 `SME2:yes`。
