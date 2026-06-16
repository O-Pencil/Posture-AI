/**
 * 全局模型下载服务：与 UI 组件生命周期解耦，切 Tab / App 退后台时下载仍可继续。
 * 进程被系统杀死后，下次打开 App 会根据 .download_state.json 自动续传。
 */
import {NativeModules} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {getDefaultModel, getModelById, MnnModelDef} from './modelCatalog';
import {
  deleteModelFiles,
  fileSizeBytes,
  formatBytes,
  modelDir,
  readDownloadState,
  writeActiveModelId,
  writeDownloadState,
} from './modelStorage';

export type DownloadJobStatus = 'idle' | 'downloading' | 'done' | 'error' | 'cancelled';

export type DownloadJobSnapshot = {
  status: DownloadJobStatus;
  modelId: string | null;
  progress: number;
  currentFile: string;
  speedBps: number;
  bytesWritten: number;
  totalBytes: number;
  error: string | null;
};

type Listener = (snapshot: DownloadJobSnapshot) => void;

type CatuneMnnModule = {
  releaseModel?: () => Promise<boolean>;
};

type ActiveResumable = ReturnType<typeof FileSystem.createDownloadResumable>;

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;

const IDLE_SNAPSHOT: DownloadJobSnapshot = {
  status: 'idle',
  modelId: null,
  progress: 0,
  currentFile: '',
  speedBps: 0,
  bytesWritten: 0,
  totalBytes: 0,
  error: null,
};

let snapshot: DownloadJobSnapshot = {...IDLE_SNAPSHOT};

const listeners = new Set<Listener>();
let running = false;
let abortRequested = false;
let activeResumable: ActiveResumable | null = null;
let speedTracker = {lastBytes: 0, lastTime: 0, fileIndex: 0, fileCount: 1};

function emit(): void {
  listeners.forEach(fn => fn(snapshot));
}

function setSnapshot(partial: Partial<DownloadJobSnapshot>): void {
  snapshot = {...snapshot, ...partial};
  emit();
}

export function formatSpeed(bps: number): string {
  if (bps <= 0) {
    return '—';
  }
  if (bps < 1024) {
    return `${Math.round(bps)} B/s`;
  }
  if (bps < 1024 * 1024) {
    return `${(bps / 1024).toFixed(1)} KB/s`;
  }
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function subscribeModelDownload(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export function getDownloadSnapshot(): DownloadJobSnapshot {
  return snapshot;
}

async function releaseNativeModel(): Promise<void> {
  try {
    await CatuneMnn?.releaseModel?.();
  } catch {
    // ignore
  }
}

function trackProgress(
  fileIndex: number,
  fileCount: number,
  fileName: string,
  p: {totalBytesWritten: number; totalBytesExpectedToWrite: number},
): void {
  const now = Date.now();
  if (speedTracker.fileIndex !== fileIndex) {
    speedTracker = {lastBytes: p.totalBytesWritten, lastTime: now, fileIndex, fileCount};
  }
  const dt = (now - speedTracker.lastTime) / 1000;
  let speedBps = snapshot.speedBps;
  if (dt >= 0.4) {
    speedBps = Math.max(0, (p.totalBytesWritten - speedTracker.lastBytes) / dt);
    speedTracker.lastBytes = p.totalBytesWritten;
    speedTracker.lastTime = now;
  }
  const filePct = p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten / p.totalBytesExpectedToWrite : 0;
  setSnapshot({
    progress: (fileIndex + filePct) / fileCount,
    currentFile: fileName,
    speedBps,
    bytesWritten: p.totalBytesWritten,
    totalBytes: p.totalBytesExpectedToWrite,
  });
}

async function downloadModelFiles(
  docDir: string,
  model: MnnModelDef,
  replaceExisting: boolean,
): Promise<void> {
  if (replaceExisting) {
    await deleteModelFiles(docDir, model);
  }
  const dir = modelDir(docDir, model);
  await FileSystem.makeDirectoryAsync(dir, {intermediates: true});

  let pending = await readDownloadState(docDir);
  if (pending?.modelId !== model.id) {
    pending = {modelId: model.id, fileIndex: 0, inProgress: true, updatedAt: Date.now()};
  } else {
    pending = {...pending, inProgress: true, updatedAt: Date.now()};
  }
  await writeDownloadState(docDir, pending);

  const fileCount = model.files.length;

  for (let i = pending.fileIndex; i < model.files.length; i++) {
    if (abortRequested) {
      throw new Error('DOWNLOAD_CANCELLED');
    }

    const fileName = model.files[i];
    const target = dir + fileName;
    const existing = await FileSystem.getInfoAsync(target);
    const existingSize = existing.exists ? fileSizeBytes(existing) : 0;
    if (existingSize > 0 && fileName !== 'llm.mnn.weight') {
      setSnapshot({
        progress: (i + 1) / fileCount,
        currentFile: fileName,
        bytesWritten: existingSize,
        totalBytes: existingSize,
      });
      pending = {modelId: model.id, fileIndex: i + 1, inProgress: true, updatedAt: Date.now()};
      await writeDownloadState(docDir, i + 1 >= fileCount ? null : pending);
      continue;
    }

    setSnapshot({currentFile: fileName, speedBps: 0, bytesWritten: 0, totalBytes: 0});
    speedTracker = {lastBytes: 0, lastTime: Date.now(), fileIndex: i, fileCount};

    const fileUrl = model.baseUrl + fileName;
    const savedPause =
      pending?.pauseState?.url === fileUrl && pending.pauseState.fileUri === target
        ? pending.pauseState
        : undefined;
    const dl = FileSystem.createDownloadResumable(
      fileUrl,
      target,
      {},
      p => trackProgress(i, fileCount, fileName, p),
      savedPause?.resumeData,
    );
    activeResumable = dl;

    try {
      const result = savedPause?.resumeData ? await dl.resumeAsync() : await dl.downloadAsync();
      if (abortRequested) {
        throw new Error('DOWNLOAD_CANCELLED');
      }
      if (!result) {
        throw new Error(`下载失败：${fileName}`);
      }
    } catch (downloadErr) {
      if (abortRequested || (downloadErr instanceof Error && downloadErr.message === 'DOWNLOAD_CANCELLED')) {
        throw new Error('DOWNLOAD_CANCELLED');
      }
      await writeDownloadState(docDir, {
        modelId: model.id,
        fileIndex: i,
        inProgress: true,
        pauseState: dl.savable(),
        updatedAt: Date.now(),
      });
      throw downloadErr;
    } finally {
      activeResumable = null;
    }

    pending = {modelId: model.id, fileIndex: i + 1, inProgress: true, updatedAt: Date.now()};
    await writeDownloadState(docDir, i + 1 >= fileCount ? null : pending);
  }

  await writeDownloadState(docDir, null);
  await writeActiveModelId(docDir, model.id);
  await releaseNativeModel();
  setSnapshot({status: 'done', progress: 1, error: null});
}

export async function startModelDownload(modelId: string, replaceExisting = false): Promise<void> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    throw new Error('当前平台不支持文件下载');
  }
  if (running) {
    return;
  }

  const model = getModelById(modelId) ?? getDefaultModel();
  running = true;
  abortRequested = false;
  setSnapshot({
    status: 'downloading',
    modelId: model.id,
    progress: 0,
    currentFile: '',
    speedBps: 0,
    bytesWritten: 0,
    totalBytes: 0,
    error: null,
  });

  try {
    await downloadModelFiles(docDir, model, replaceExisting);
    if (!abortRequested) {
      setSnapshot({status: 'done'});
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'DOWNLOAD_CANCELLED') {
      setSnapshot({...IDLE_SNAPSHOT, status: 'cancelled'});
      return;
    }
    setSnapshot({status: 'error', error: message});
    throw e;
  } finally {
    running = false;
    activeResumable = null;
  }
}

/** 停止下载并删除未完成的模型文件。 */
export async function cancelModelDownloadAndCleanup(): Promise<void> {
  const modelId = snapshot.modelId;
  abortRequested = true;

  if (activeResumable) {
    try {
      await activeResumable.pauseAsync();
    } catch {
      // ignore
    }
    activeResumable = null;
  }

  const docDir = FileSystem.documentDirectory;
  if (docDir && modelId) {
    const model = getModelById(modelId);
    if (model) {
      await deleteModelFiles(docDir, model);
    }
    await writeDownloadState(docDir, null);
  }

  running = false;
  abortRequested = false;
  setSnapshot({...IDLE_SNAPSHOT, status: 'cancelled'});
}

export function cancelModelDownload(): void {
  abortRequested = true;
  if (activeResumable) {
    activeResumable.pauseAsync().catch(() => undefined);
  }
}

/** App 启动时：若有未完成的 inProgress 任务，自动续传。 */
export async function resumePendingDownloadIfNeeded(): Promise<boolean> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir || running) {
    return false;
  }
  const pending = await readDownloadState(docDir);
  if (!pending?.inProgress) {
    return false;
  }
  try {
    await startModelDownload(pending.modelId, false);
    return true;
  } catch {
    return false;
  }
}

export {formatBytes};
