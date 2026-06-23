/**
 * @file types.ts
 * @description AI 体态评估数据契约。后端可插拔：端侧 VL / 云端(BYO Key) / 预置兜底。详见 docs/模型与记忆个性化设计.md。
 *
 * [WHO] 导出 `AssessBackend`/`CloudConfig`/`AssessConfig`/`AssessObservation`/`AssessmentResult`/`DEFAULT_ASSESS_CONFIG`
 * [FROM] 无依赖（纯类型）
 * [TO] 被 src/assess/{config,preset,cloudClient,localVlClient,service}.ts 与评估页/配置卡消费
 * [HERE] src/assess/types.ts · 评估数据契约
 */

/** 评估后端：端侧 VL 模型 / 云端 API / 预置结果。 */
export type AssessBackend = 'local' | 'cloud' | 'preset';

export interface CloudConfig {
  /** OpenAI/DashScope 兼容端点，如 https://dashscope.aliyuncs.com/compatible-mode/v1 。 */
  baseURL: string;
  /** 仅存本机，不进 git。 */
  apiKey: string;
  /** 视觉模型名，如 qwen-vl-max / qwen-vl-plus。 */
  model: string;
}

export interface AssessConfig {
  backend: AssessBackend;
  cloud: CloudConfig;
}

export const DEFAULT_ASSESS_CONFIG: AssessConfig = {
  backend: 'preset',
  cloud: {
    // 阿里云百炼 OpenAI 兼容端点；`/compatible-mode/v1` 才是 chat/completions 路径。
    // 之前默认写成这个，但用户从控制台复制的 `/api/v1` 会 404（百炼模型列表/管理用，不是 chat）。
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: 'qwen-vl-max',
  },
};

export type Severity = 'ok' | 'mild' | 'warn';

export interface AssessObservation {
  /** 部位/维度，如「头前倾」。 */
  label: string;
  /** 观察值，如「约 18°」或「轻度」。 */
  value: string;
  severity?: Severity;
}

export interface AssessmentResult {
  source: AssessBackend;
  /** 一句话总结（≤30 字，已过安全链）。 */
  summary: string;
  observations: AssessObservation[];
  /** 1-2 条建议动作。 */
  suggestions: string[];
  /** 模型原始输出（调试用）。 */
  raw?: string;
}
