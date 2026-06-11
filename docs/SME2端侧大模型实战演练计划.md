# SME2 端侧大模型实战演练计划

> 版本：2026-06-11
> 适用项目：Catune / Omni-Posture Master
> 关系说明：本文是 `端侧模型对接计划.md` 的实操版，目标是先在手机命令行跑通 `MNN + Qwen + SME2`，再接回 Catune Android App。

---

## 1. 目标

本计划按“先命令行验证，后 App 集成”的顺序推进：

1. 从 MNN 源码编译带 SME2/KleidiAI/LLM 支持的 Android arm64 推理引擎。
2. 下载或转换 MNN 格式 Qwen 模型。
3. 将 `llm_demo`、`llm_bench`、`libMNN.so` 和模型推送到安卓真机，在 `/data/local/tmp` 命令行验证推理。
4. 确认设备是否支持 SME2，以及 MNN 是否具备 SME2 编译产物。
5. 将验证过的 `libMNN.so` 和模型链路接回 Catune 的 JNI/Kotlin/RN 调试入口。

验收优先级：

| 优先级 | 验收点 |
| --- | --- |
| P0 | `llm_demo` 在安卓真机上能读取模型并输出文本 |
| P0 | `adb logcat` 可看到硬件能力日志，明确 `sme2: 0/1` |
| P0 | Catune `assembleDebug -PenableMnn=true` 能编出 APK |
| P1 | Catune 内部调试入口能调用 `MnnPerceptionEngine.inferText()` |
| P1 | UI 显示 `backend`、`ttft_ms`、`decode_tps`、`tokens_generated` |

---

## 2. 前置准备

### 2.1 必需环境

| 项 | 要求 | 当前项目注意点 |
| --- | --- | --- |
| Android NDK | 推荐 r27+ | Catune 当前 `android/build.gradle` 指定 `27.0.12077973` |
| ADB | `adb devices` 能发现设备 | 必须用安卓 arm64 真机，x86_64 模拟器不适合测模型 |
| JDK | JDK 17+ | 当前开发机已配置 `D:\software\AndroidStudio\jbr` |
| 手机 | 开启开发者模式 + USB 调试 | SME2 只有特定新 Arm CPU 支持，不支持时应回退 NEON |
| 编译环境 | 推荐 WSL2 Ubuntu / Linux | 文章中的 `build_64.sh` 是 shell 脚本，Windows PowerShell 不适合直接跑 |

### 2.1.1 当前环境记录（2026-06-11）

已确认当前连接设备为 Android 16 KB x86_64 模拟器：

```text
model: sdk_gphone16k_x86_64
abi: x86_64
page size: 16384
```

结论：该模拟器可用于 RN UI 和 16 KB 兼容性观察，但不能验证 Arm SME2 或 arm64 MNN 推理。模型推理验收仍需 arm64 安卓真机。

已确认 Windows 侧可用工具：

```text
JDK: D:\software\AndroidStudio\jbr
NDK: D:\Android\Sdk\ndk\27.0.12077973
CMake: D:\Android\Sdk\cmake\3.22.1
```

### 2.2 建议目录

MNN 源码建议放在项目外，避免把大型第三方源码提交进 Catune：

```text
D:\Projects\MNN
```

Catune 仓库中只保留必要接入文件：

```text
android/app/src/main/jniLibs/arm64-v8a/libMNN.so
android/app/src/main/cpp/third_party/MNN/    # 可放源码，也可用 CMake 参数指向外部源码
```

---

## 3. Step 1：编译 MNN 推理引擎

进入 MNN Android 工程目录：

```bash
cd MNN/project/android
mkdir -p build_64
cd build_64
```

执行 Android arm64 构建：

```bash
../build_64.sh "-DMNN_SME2=ON -DMNN_KLEIDIAI=ON -DMNN_LOW_MEMORY=true -DMNN_CPU_WEIGHT_DEQUANT_GEMM=true -DMNN_BUILD_LLM=true -DMNN_SUPPORT_TRANSFORMER_FUSE=true -DMNN_ARM82=true -DMNN_USE_LOGCAT=true -DMNN_OPENCL=true -DLLM_SUPPORT_VISION=true -DMNN_BUILD_OPENCV=true -DMNN_IMGCODECS=true -DLLM_SUPPORT_AUDIO=true -DMNN_BUILD_AUDIO=true -DMNN_BUILD_DIFFUSION=ON -DMNN_SEP_BUILD=OFF -DCMAKE_SHARED_LINKER_FLAGS='-Wl,-z,max-page-size=16384' -DCMAKE_INSTALL_PREFIX=."
```

安装构建产物到 `build_64/`：

```bash
make install
```

`make install` 必须执行。它会把 `libMNN.so` 整理到 `build_64/lib/`，后续 App 编译和打包要引用这个库。

关键产物：

```text
MNN/project/android/build_64/libMNN.so
MNN/project/android/build_64/llm_demo
MNN/project/android/build_64/llm_bench
```

### 3.1 编译选项说明

| 选项 | 作用 |
| --- | --- |
| `-DMNN_SME2=ON` | 编译 SME2 优化代码。硬件支持不等于产物包含 SME2，必须编译时打开 |
| `-DMNN_KLEIDIAI=ON` | 启用 Arm KleidiAI 微内核 |
| `-DMNN_BUILD_LLM=true` | 构建 MNN-LLM 相关能力 |
| `-DMNN_LOW_MEMORY=true` | 降低端侧内存压力 |
| `-DMNN_CPU_WEIGHT_DEQUANT_GEMM=true` | 启用 CPU 权重量化反量化 GEMM 路径 |
| `-DMNN_ARM82=true` | 启用 Armv8.2 相关优化 |
| `-DLLM_SUPPORT_VISION=true` | 支持 VL 模型图像输入 |
| `-DLLM_SUPPORT_AUDIO=true` | 支持音频输入。Catune 当前不需要，可后续关闭减小体积 |
| `-DCMAKE_SHARED_LINKER_FLAGS='-Wl,-z,max-page-size=16384'` | 生成 16 KB page size 兼容的 ELF 对齐 |

Catune 当前姿态建议只需要文本推理。第一轮如果构建太慢或体积太大，可以先关闭 vision/audio/diffusion：

```bash
-DLLM_SUPPORT_VISION=false -DLLM_SUPPORT_AUDIO=false -DMNN_BUILD_DIFFUSION=OFF
```

### 3.2 当前已完成的 Windows 构建记录（2026-06-11）

由于 WSL 中下载 Linux 版 NDK r27 速度过慢且多次断连，本次改用 Windows 原生 Android NDK/CMake 完成 MNN Android arm64 构建。

源码位置：

```text
D:\Projects\MNN
```

来源：

```text
https://gitee.com/mirrors/MNN.git
commit: 2106d00
```

构建目录：

```text
D:\Projects\MNN\project\android\build_64_win
```

核心配置：

```text
ANDROID_ABI=arm64-v8a
ANDROID_NATIVE_API_LEVEL=android-21
MNN_SME2=ON
MNN_KLEIDIAI=ON
MNN_BUILD_LLM=true
MNN_ARM82=true
MNN_OPENCL=ON
MNN_USE_LOGCAT=true
MNN_BUILD_DIFFUSION=OFF
MNN_BUILD_OPENCV=OFF
MNN_IMGCODECS=OFF
CMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384
```

构建日志已确认：

```text
System: Android
Processor: aarch64
KleidiAI: ON
ARM82: true
OpenCL: ON
```

编译过程中也出现了 SME2/KleidiAI 相关对象：

```text
kai_*_sme2_*_asm.S.o
sme2_asm/MNNGemmInt8AddBiasScale16x32_SME2_w4_Fp16.S.o
```

产物：

```text
D:\Projects\MNN\project\android\build_64_win\libMNN.so   7133824 bytes
D:\Projects\MNN\project\android\build_64_win\llm_demo     29664 bytes
D:\Projects\MNN\project\android\build_64_win\llm_bench   134280 bytes
```

16 KB ELF 对齐验证：

```text
llvm-readelf -l libMNN.so
LOAD ... Align 0x4000
LOAD ... Align 0x4000
LOAD ... Align 0x4000
```

说明：`cmake --install` 在 Windows 下把安装产物写到了 `D:\lib\libMNN.so` 和 `D:\include\...`，但后续以构建目录中的三个核心产物为准。

---

## 4. Step 2：准备模型

### 4.1 推荐方案：下载 MNN 官方模型

进入 MNN-LLM export 目录：

```bash
cd MNN/transformers/llm/export
pip install modelscope
modelscope download --model MNN/Qwen3-VL-4B-Instruct-MNN --local_dir Qwen3-VL-4B-Instruct-MNN
```

说明：

- 文章使用 `Qwen3-VL-4B-Instruct-MNN` 做演示。
- Catune 当前输入是姿态角度和状态，不需要图像理解；为比赛演示，优先建议选择更小的 MNN 文本模型跑通 `inferText()`。
- 如果使用 4B VL，要评估手机内存、模型体积、首 token 延迟和存储空间。

### 4.2 自行转换模型

安装转换依赖：

```bash
cd MNN/transformers/llm/export
pip install -r requirements.txt
```

下载原始模型：

```bash
modelscope download Qwen/Qwen3-VL-4B-Instruct --local_dir Qwen3-VL-4B-Instruct
```

导出 MNN 格式并使用 HQQ 量化：

```bash
python llmexport.py --path Qwen3-VL-4B-Instruct --dst_path Qwen3-VL-4B-Instruct-MNN --export mnn --hqq
```

模型目录至少应包含：

```text
config.json
llm.mnn
llm.mnn.weight
```

---

## 5. Step 3：推送到手机并命令行验证

### 5.1 推送引擎文件

```bash
adb push MNN/project/android/build_64/llm_demo /data/local/tmp/
adb push MNN/project/android/build_64/llm_bench /data/local/tmp/
adb push MNN/project/android/build_64/libMNN.so /data/local/tmp/
```

如果 `libMNN.so` 位于 `build_64/lib/libMNN.so`，以实际路径为准：

```bash
adb push MNN/project/android/build_64/lib/libMNN.so /data/local/tmp/
```

### 5.2 推送模型

```bash
adb shell mkdir -p /data/local/tmp/mnn_models
adb push Qwen3-VL-4B-Instruct-MNN /data/local/tmp/mnn_models/
```

### 5.3 运行文本推理

进入手机 shell：

```bash
adb shell
```

赋权并创建 prompt：

```bash
cd /data/local/tmp
chmod +x llm_demo llm_bench
echo "请用一句中文提醒我坐直。" > prompt.txt
```

设置动态库路径：

```bash
export LD_LIBRARY_PATH=/data/local/tmp:$LD_LIBRARY_PATH
```

运行推理：

```bash
./llm_demo /data/local/tmp/mnn_models/Qwen3-VL-4B-Instruct-MNN/config.json /data/local/tmp/prompt.txt
```

为什么需要 `LD_LIBRARY_PATH`：

`llm_demo` 动态链接 `libMNN.so`。Android 默认不会搜索 `/data/local/tmp/`，因此要显式告诉链接器从这里加载动态库。

### 5.4 运行性能基准

```bash
cd /data/local/tmp
export LD_LIBRARY_PATH=/data/local/tmp:$LD_LIBRARY_PATH
./llm_bench /data/local/tmp/mnn_models/Qwen3-VL-4B-Instruct-MNN/config.json
```

记录：

```text
设备型号：
Android 版本：
PAGE_SIZE：
模型：
首 token 延迟：
decode TPS：
总耗时：
峰值内存：
```

查询 page size：

```bash
adb shell getconf PAGE_SIZE
```

---

## 6. Step 4：确认 SME2 支持

另开电脑终端查看硬件检测日志：

```bash
adb logcat | grep "device supports"
```

预期类似：

```text
The device supports: i8sdot:1, fp16:1, i8mm: 1, sve2: 1, sme2: 1
```

判断规则：

| 日志 | 含义 |
| --- | --- |
| `sme2: 1` | CPU 硬件支持 SME2，MNN 可走 SME2 路径 |
| `sme2: 0` | 硬件不支持 SME2，应回退 i8mm / NEON |
| 没有日志 | 检查是否启用 `-DMNN_USE_LOGCAT=true`，或用 `adb logcat` 全量搜索 MNN 相关日志 |

注意：

- `sme2: 1` 只代表硬件支持。
- `-DMNN_SME2=ON` 代表编译产物包含 SME2 优化代码。
- 两者都满足，才可能实际使用 SME2 加速。

---

## 7. Step 5：接回 Catune App

命令行验证成功后，再接回 Catune。不要跳过前面的 `llm_demo` 验证，否则 App 侧排错范围会过大。

### 7.1 替换 Catune 的 MNN 运行库

将验证过的 `libMNN.so` 复制到：

```text
android/app/src/main/jniLibs/arm64-v8a/libMNN.so
```

来源：

```text
MNN/project/android/build_64/libMNN.so
```

或：

```text
MNN/project/android/build_64/lib/libMNN.so
```

### 7.2 准备 Catune CMake 所需 MNN 源码

方案 A：复制源码到仓库内：

```text
android/app/src/main/cpp/third_party/MNN/
```

要求至少存在：

```text
include/MNN/
transformers/llm/engine/include/
tools/audio/include/
3rd_party/
```

方案 B：保留 MNN 源码在仓库外，用 CMake 参数指向：

```bash
-DMNN_SOURCE_ROOT=/absolute/path/to/MNN
```

### 7.3 构建 Catune 原生桥

```powershell
cd D:\Projects\Pencil\Pencil-Hackathon\AI-Pose-Master\android
.\gradlew.bat assembleDebug -PenableMnn=true --console=plain
```

成功后 APK 应包含：

```text
lib/arm64-v8a/libMNN.so
lib/arm64-v8a/libposture_ai_bridge.so
```

### 7.4 推送模型到 Catune 私有目录

当前 Kotlin 默认模型目录是：

```text
/data/data/com.catune/files/mnn_models/qwen3-vl-2b/
```

如果实际模型是 `Qwen3-VL-4B-Instruct-MNN`，有两种选择：

1. 改 Kotlin 代码里的目录名。
2. 保持代码不动，把模型文件推到 `qwen3-vl-2b` 目录。

推荐先保持代码不动：

```powershell
adb shell run-as com.catune mkdir -p files/mnn_models/qwen3-vl-2b

adb push Qwen3-VL-4B-Instruct-MNN\config.json /sdcard/config.json
adb push Qwen3-VL-4B-Instruct-MNN\llm.mnn /sdcard/llm.mnn
adb push Qwen3-VL-4B-Instruct-MNN\llm.mnn.weight /sdcard/llm.mnn.weight

adb shell run-as com.catune cp /sdcard/config.json files/mnn_models/qwen3-vl-2b/config.json
adb shell run-as com.catune cp /sdcard/llm.mnn files/mnn_models/qwen3-vl-2b/llm.mnn
adb shell run-as com.catune cp /sdcard/llm.mnn.weight files/mnn_models/qwen3-vl-2b/llm.mnn.weight
```

### 7.5 增加最小调试入口

第一版不要直接改主姿态流程。先加一个调试入口调用：

```kotlin
MnnPerceptionEngine.tryCreate(context)
    ?.inferText("请用一句中文提醒我坐直。")
```

UI 暴露字段：

```text
MNN loaded: true/false
Model ready: true/false
backend: SME2 / NEON / unknown
ttft_ms: number
decode_tps: number
tokens_generated: number
raw_output: string
```

调试入口通过后，再接入 `src/posture/engine.ts` 的建议文案生成路径。

---

## 8. Catune 接入策略

Catune 的产品纪律是：姿态分类和安全底线走规则，模型只补文案。

推荐链路：

```text
src/posture/engine.ts
  -> 规则判断 posture / score / severity
  -> 构造短 prompt
  -> NativeMnn.inferText(prompt)
  -> 成功：使用模型文案 + 指标
  -> 失败：ruleFallback
```

模型 prompt 建议：

```text
你是坐姿康复助手。请根据以下结构化状态生成一句不超过 30 字的中文提醒。
状态：TECH_NECK
颈前倾角：28 度
腰椎侧倾角：3 度
异常持续：2 分钟
要求：温和、具体、不要医疗诊断、不要恐吓。
```

输出约束：

```json
{
  "advice": "下巴微收，肩颈放松，屏幕抬高一点。",
  "action_id": "chin_tuck",
  "severity_level": "medium"
}
```

失败回退：

| 失败类型 | 处理 |
| --- | --- |
| native lib 未加载 | `ruleFallback` |
| 模型目录缺失 | `ruleFallback` + UI 显示 degraded |
| 推理超时 | 取消本次模型文案，保留规则建议 |
| JSON 解析失败 | 使用 sanitize 后的文本，或回退规则 |
| 命中禁词 | 替换为本地安全文案 |

---

## 9. 常见问题

| 问题 | 排查 |
| --- | --- |
| `llm_demo: not found` | 检查是否推送到 `/data/local/tmp`，并执行 `chmod +x` |
| `libMNN.so not found` | 检查 `LD_LIBRARY_PATH=/data/local/tmp:$LD_LIBRARY_PATH` |
| `config.json not found` | 检查模型目录和命令路径是否一致 |
| `sme2: 1` 但速度不快 | 检查 MNN 是否用 `-DMNN_SME2=ON` 编译，模型是否量化，是否实际走 CPU 后端 |
| Catune CMake 找不到 `include/MNN` | 检查 `third_party/MNN` 或 `MNN_SOURCE_ROOT` |
| APK 内没有 `libposture_ai_bridge.so` | 确认构建命令包含 `-PenableMnn=true` |
| x86_64 模拟器无法测模型 | 预期行为；模型链路只测 arm64 真机 |
| 16 KB page size 警告 | MNN 编译时保留 `-Wl,-z,max-page-size=16384`，RN 第三方库需后续升级处理 |

---

## 10. 执行清单

### A. 命令行链路

- [x] `adb devices` 能发现设备（当前为 x86_64 模拟器，非真机）。
- [x] `adb shell getconf PAGE_SIZE` 已记录（当前模拟器为 `16384`）。
- [x] MNN 源码已拉取到 `D:\Projects\MNN`。
- [x] Windows NDK/CMake 方式已完成 MNN Android arm64 构建。
- [x] 已生成 `llm_demo` / `llm_bench` / `libMNN.so`。
- [ ] `llm_demo` / `llm_bench` / `libMNN.so` 已推送到 arm64 真机。
- [ ] MNN 格式 Qwen 模型已推送到 `/data/local/tmp/mnn_models/`。
- [ ] `llm_demo` 可输出中文回复。
- [ ] `adb logcat` 已记录 `sme2: 0/1`。
- [ ] `llm_bench` 已记录 TTFT / TPS / 总耗时。

### B. Catune 原生桥

- [ ] 已替换 `android/app/src/main/jniLibs/arm64-v8a/libMNN.so`。
- [ ] `android/app/src/main/cpp/third_party/MNN/` 或 `MNN_SOURCE_ROOT` 已配置。
- [ ] `.\gradlew.bat assembleDebug -PenableMnn=true --console=plain` 成功。
- [ ] APK 内含 `libMNN.so` 和 `libposture_ai_bridge.so`。
- [ ] 模型已推送到 `/data/data/com.catune/files/mnn_models/qwen3-vl-2b/`。
- [ ] 原生调试入口可调用 `inferText()`。
- [ ] UI 可展示模型状态和推理指标。

### C. 产品主链路

- [ ] TS 规则引擎仍可在无模型时独立运行。
- [ ] 模型只负责建议文案，不负责安全底线。
- [ ] 模型失败时 `ruleFallback` 生效。
- [ ] 禁词过滤和安全文案替换生效。
- [ ] 关网演示可完成一次姿态异常提醒。

---

## 11. 当前建议

第一阶段只做两件事：

1. 接入 arm64 安卓真机。
2. 在真机上用 `llm_demo` 跑通 MNN 模型。
3. 记录 `sme2: 0/1`、TTFT、TPS、模型体积、设备型号。

完成后再进入 Catune App 接线。这样可以把问题清晰分成“引擎/模型问题”和“App 接线问题”，避免在 React Native、JNI、MNN、模型四层同时排错。
