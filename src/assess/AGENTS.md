# src/assess · P2 模块地图

> 体态视觉评估（TS，含云端 / 端侧两套客户端 + 兜底）
> 文档协议：DIP P2

## 成员

| 文件 | 职责 |
| --- | --- |
| `types.ts` | 评估数据契约（AssessBackend / AssessConfig / AssessmentResult） |
| `config.ts` | 评估配置持久化（Key / 后端选择） |
| `preset.ts` | 3 套预置评估结果（降级兜底） |
| `parse.ts` | 云端 VL 输出解析（Qwen-VL JSON → AssessmentResult） |
| `cloudClient.ts` | 云端 Qwen-VL 评估客户端 |
| `localVlClient.ts` | 端侧 VL 评估客户端（原生桥） |
| `service.ts` | 评估编排（选后端 → 调用 → 解析 → 兜底） |
| `readiness.ts` | 评估就绪检查（Key / 依赖 / 设备） |

## 关键约束

- **两套后端互斥**：`AssessBackend = 'cloud' | 'local' | 'auto'`，`service.ts` 选一次。
- **缺数据兜底**：`preset.ts` 的 3 套预置 + `parse.ts` 失败时回退"暂无评估"。
- **Key 隔离**：`config.ts` 不直接读 `localStorage`，通过 `src/platform/memory/service` 持久化。

## 数据流

```
[读图] src/ui/screens/AssessScreen ──► service.run(image)
       ↓
[选后端] service 判 'auto' → readiness.check() → 选 cloud / local
       ↓
[调用] cloudClient.run() OR localVlClient.run()
       ↓
[解析] parse(result) → AssessmentResult
       ↓
[兜底] parse 失败 / API 失败 → pickPreset() → 显示 3 套预置之一
```

## 消费方

- `src/ui/screens/AssessScreen.tsx` · 评估屏（拍照 + 提交）
- `src/ui/components/AssessResult.tsx` · 评估结果展示