/**
 * 端侧 MNN 模型清单。须与 android MnnModelPaths.DEFAULT_MODEL_ID 默认项一致。
 */
export type MnnModelDef = {
  id: string;
  label: string;
  sizeHint: string;
  /** 相对 documentDirectory，如 mnn_models/qwen2.5-0.5b/ */
  subdir: string;
  baseUrl: string;
  files: readonly string[];
  /** emulator=模拟器联调；device=真机推荐；sme2=SME2 验收用大模型 */
  tags: readonly ('emulator' | 'device' | 'sme2')[];
  /** 视觉模型（VL）：走 analyzeImage 图像路径用于体态评估；不作为文本教练默认。 */
  vision?: boolean;
  emulatorNote?: string;
};

export const MNN_MODELS_ROOT = 'mnn_models/';
export const ACTIVE_MODEL_FILE = `${MNN_MODELS_ROOT}.active`;
export const DOWNLOAD_STATE_FILE = `${MNN_MODELS_ROOT}.download_state.json`;

export const DEFAULT_MODEL_ID = 'qwen2.5-0.5b';

const MNN_FILE_SET = [
  'config.json',
  'llm_config.json',
  'llm.mnn',
  'llm.mnn.weight',
  'tokenizer.txt',
  'embeddings_bf16.bin',
] as const;

// VL 模型在 LLM 文件集基础上多视觉编码器文件。
// ⚠ 下载前务必核对所选 HF 仓库实际文件名（不同导出可能为 visual.mnn 单文件或含 .weight），否则下载会 404。
const VL_FILE_SET = [...MNN_FILE_SET, 'visual.mnn', 'visual.mnn.weight'] as const;

export const MODEL_CATALOG: readonly MnnModelDef[] = [
  {
    id: 'qwen2.5-0.5b',
    label: 'Qwen2.5-0.5B',
    sizeHint: '~550MB',
    subdir: `${MNN_MODELS_ROOT}qwen2.5-0.5b/`,
    baseUrl: 'https://hf-mirror.com/taobao-mnn/Qwen2.5-0.5B-Instruct-MNN/resolve/main/',
    files: MNN_FILE_SET,
    tags: ['emulator', 'device'],
    emulatorNote: '模拟器可跑通下载与 UI；INT4 推理易出现乱码，中文质量以真机为准。',
  },
  {
    id: 'qwen3-1.7b',
    label: 'Qwen3-1.7B',
    sizeHint: '~1.2GB',
    subdir: `${MNN_MODELS_ROOT}qwen3-1.7b/`,
    baseUrl: 'https://hf-mirror.com/taobao-mnn/Qwen3-1.7B-MNN/resolve/main/',
    files: MNN_FILE_SET,
    tags: ['device', 'sme2'],
    emulatorNote: '体积大，模拟器易 OOM；仅建议在 SME2/大内存真机验收。',
  },
  {
    id: 'qwen2-vl-2b',
    label: 'Qwen2-VL-2B（体态评估）',
    sizeHint: '~1.5GB',
    subdir: `${MNN_MODELS_ROOT}qwen2-vl-2b/`,
    baseUrl: 'https://hf-mirror.com/taobao-mnn/Qwen2-VL-2B-Instruct-MNN/resolve/main/',
    files: VL_FILE_SET,
    tags: ['device', 'sme2'],
    vision: true,
    emulatorNote: '视觉模型，供 AI 评估的 analyzeImage 路径；仅真机、体积大、易 OOM。' +
      '下载前核对仓库文件名；可能需 libMNN 含视觉支持重编。设为活跃模型后端侧 VL 评估才生效。',
  },
];

/** 视觉（VL）模型清单（用于端侧体态评估）。 */
export function getVisionModels(): readonly MnnModelDef[] {
  return MODEL_CATALOG.filter(m => m.vision);
}

export function getModelById(id: string): MnnModelDef | undefined {
  return MODEL_CATALOG.find(m => m.id === id);
}

export function getDefaultModel(): MnnModelDef {
  return getModelById(DEFAULT_MODEL_ID) ?? MODEL_CATALOG[0];
}
