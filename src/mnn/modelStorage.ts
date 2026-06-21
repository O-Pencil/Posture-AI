/**
 * @file modelStorage.ts
 * @description 模型文件存储工具：读写活跃模型 ID、下载状态、已安装模型信息、模型文件删除与大小查询。
 *
 * [WHO] 导出 `ModelInstallState`、`DownloadState`、`InstalledModelInfo`、`readActiveModelId`、
 *   `writeActiveModelId`、`readDownloadState`、`writeDownloadState`、`modelDir`、`fileSizeBytes`、
 *   `formatBytes`、`deleteModelFiles`、`getInstalledModels`
 * [FROM] 依赖 `expo-file-system/legacy`、`./modelCatalog`
 * [TO] 被 `modelDownloadService`、`ModelDownloadCard` 引用
 * [HERE] src/mnn/modelStorage.ts · 模型文件存储与状态管理
 */
import {
  ACTIVE_MODEL_FILE,
  DEFAULT_MODEL_ID,
  DOWNLOAD_STATE_FILE,
  getModelById,
  MNN_MODELS_ROOT,
  MnnModelDef,
  MODEL_CATALOG,
} from './modelCatalog';
import * as FileSystem from 'expo-file-system/legacy';

export type ModelInstallState = 'missing' | 'partial' | 'ready';

export type DownloadState = {
  modelId: string;
  fileIndex: number;
  /** 用户曾发起下载；App 重启后可自动续传 */
  inProgress?: boolean;
  pauseState?: {
    url: string;
    fileUri: string;
    resumeData?: string;
  };
  updatedAt: number;
};

export type InstalledModelInfo = {
  model: MnnModelDef;
  state: ModelInstallState;
  dirSizeBytes: number;
};

function modelDir(docDir: string, model: MnnModelDef): string {
  return docDir + model.subdir;
}

export async function readActiveModelId(docDir: string): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(docDir + ACTIVE_MODEL_FILE);
    if (!info.exists) {
      return DEFAULT_MODEL_ID;
    }
    const raw = (await FileSystem.readAsStringAsync(docDir + ACTIVE_MODEL_FILE)).trim();
    if (raw && getModelById(raw)) {
      return raw;
    }
  } catch {
    // fall through
  }
  return DEFAULT_MODEL_ID;
}

export async function writeActiveModelId(docDir: string, modelId: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(docDir + MNN_MODELS_ROOT, {intermediates: true});
  await FileSystem.writeAsStringAsync(docDir + ACTIVE_MODEL_FILE, modelId);
}

function fileSizeBytes(info: FileSystem.FileInfo): number {
  return info.exists && !info.isDirectory ? info.size : 0;
}

export {modelDir, fileSizeBytes};

export async function getModelInstallState(docDir: string, model: MnnModelDef): Promise<ModelInstallState> {
  const dir = modelDir(docDir, model);
  const config = await FileSystem.getInfoAsync(dir + 'config.json');
  if (!config.exists) {
    return 'missing';
  }
  for (const file of model.files) {
    const info = await FileSystem.getInfoAsync(dir + file);
    if (!info.exists || fileSizeBytes(info) < 1) {
      return 'partial';
    }
  }
  return 'ready';
}

async function dirSizeBytes(path: string): Promise<number> {
  let total = 0;
  try {
    const entries = await FileSystem.readDirectoryAsync(path);
    for (const name of entries) {
      const full = `${path}${name}`;
      const info = await FileSystem.getInfoAsync(full);
      if (info.isDirectory) {
        total += await dirSizeBytes(`${full}/`);
      } else if (info.exists) {
        total += fileSizeBytes(info);
      }
    }
  } catch {
    return 0;
  }
  return total;
}

export async function listInstalledModels(docDir: string): Promise<InstalledModelInfo[]> {
  const result: InstalledModelInfo[] = [];
  for (const model of MODEL_CATALOG) {
    const state = await getModelInstallState(docDir, model);
    if (state === 'missing') {
      continue;
    }
    const size = await dirSizeBytes(modelDir(docDir, model));
    result.push({model, state, dirSizeBytes: size});
  }
  return result;
}

export async function readDownloadState(docDir: string): Promise<DownloadState | null> {
  try {
    const info = await FileSystem.getInfoAsync(docDir + DOWNLOAD_STATE_FILE);
    if (!info.exists) {
      return null;
    }
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(docDir + DOWNLOAD_STATE_FILE)) as DownloadState;
    if (!parsed?.modelId || typeof parsed.fileIndex !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDownloadState(docDir: string, state: DownloadState | null): Promise<void> {
  await FileSystem.makeDirectoryAsync(docDir + MNN_MODELS_ROOT, {intermediates: true});
  if (state == null) {
    await FileSystem.deleteAsync(docDir + DOWNLOAD_STATE_FILE, {idempotent: true});
    return;
  }
  await FileSystem.writeAsStringAsync(docDir + DOWNLOAD_STATE_FILE, JSON.stringify(state));
}

export async function deleteModelFiles(docDir: string, model: MnnModelDef): Promise<void> {
  await FileSystem.deleteAsync(modelDir(docDir, model), {idempotent: true});
  const pending = await readDownloadState(docDir);
  if (pending?.modelId === model.id) {
    await writeDownloadState(docDir, null);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
