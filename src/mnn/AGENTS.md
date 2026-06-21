# src/mnn · P2 模块地图

> 端侧模型管理（TS，iOS/Android/Web 通用）
> 文档协议：DIP P2

## 成员

| 文件 | 职责 |
| --- | --- |
| `modelCatalog.ts` | 模型清单（0.5B / 1.7B 定义、标签、下载地址、推荐标签） |
| `modelDownloadService.ts` | 全局下载服务（续传 / 暂停 / 进度回调；进程重启自动恢复） |
| `modelStorage.ts` | 模型文件存储工具（路径 / 校验 / 清理） |
| `deviceProfile.ts` | 设备探测 + 分级（入门/主流/高性能）+ 模型推荐（RAM/SME2/存储） |
| `inferStreamClient.ts` | 端侧推理流式客户端（原生 MNN/JNI 桥） |

## 关键约束

- **iOS / Android 通用**：零 `Platform.OS` 判断，运行时根据 `deviceProfile` 分级。
- **降级优先**：模型未下载 / 推理失败 → 上层用 `src/posture/ruleFallback` 兜底（PRD §5.10）。
- **进度观察**：`subscribeDownload` 必须幂等可重复订阅，避免 React 重渲染导致多订阅。

## 数据流

```
[设备探测] deviceProfile.recommendModel() → 推荐 0.5B / 1.7B
       ↓
[下载] modelDownloadService.startDownload(id, onProgress) → 落盘
       ↓
[推理] inferStreamClient.inferStream(prompt, onChunk) → 流式写回
```

## 消费方

- `src/ui/components/ModelDownloadCard.tsx` · 模型管理卡片
- `src/ui/components/ModelDownloadBanner.tsx` · 全局下载进度条
- `src/posture/adviceOrchestrator.ts` · 调 `inferStreamClient` 流式覆盖建议
- `src/ui/screens/BenchmarkScreen.tsx` · 模型基准测试

## 已删除

- 旧的 `MnnDebugModule.ts`（Kotlin 侧调试入口，已迁到 `android/app/src/main/java/com/catune/rn/`）