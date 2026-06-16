/**
 * @file inferStreamClient.ts
 * @description 端侧模型推理客户端：优先用原生「逐段流式」（CatuneMnn.inferTextStream + onMnnToken/onMnnDone/onMnnError 事件），
 *   原生没有该方法时回退到现有 `inferText`（一次性返回，仍是异步后台）。JS 上层无感。
 *
 * [WHO] 导出 `isModelAvailable()`、`streamInfer(prompt, handlers): cancelFn`
 * [FROM] 依赖 `react-native`(NativeModules / NativeEventEmitter) 的 `CatuneMnn`
 * [TO] 被 src/posture/adviceOrchestrator 调用
 * [HERE] src/mnn/inferStreamClient.ts · 端侧推理流式客户端
 */
import {NativeEventEmitter, NativeModules} from 'react-native';

type CatuneMnnModule = {
  inferText?: (prompt: string) => Promise<{rawOutput?: string}>;
  inferTextStream?: (prompt: string) => Promise<void>;
  cancelInfer?: () => void;
};

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;
const emitter = CatuneMnn ? new NativeEventEmitter(NativeModules.CatuneMnn) : null;

export type StreamHandlers = {
  /** 增量片段（流式逐段；回退路径会一次性给整段）。 */
  onToken: (chunk: string) => void;
  /** 生成结束，full 为完整文本。 */
  onDone: (full: string) => void;
  onError: (msg: string) => void;
};

export function isModelAvailable(): boolean {
  return Boolean(CatuneMnn && (CatuneMnn.inferTextStream || CatuneMnn.inferText));
}

/** 触发一次推理，返回取消函数。 */
export function streamInfer(prompt: string, h: StreamHandlers): () => void {
  if (!CatuneMnn) {
    h.onError('CatuneMnn 原生模块不可用（iOS/Web/Expo Go 无）');
    return () => {};
  }

  // 优先：真·逐段流式
  if (CatuneMnn.inferTextStream && emitter) {
    let acc = '';
    let done = false;
    const cleanup = () => subs.forEach(s => s.remove());
    const subs = [
      emitter.addListener('onMnnToken', (e: {token?: string}) => {
        const t = e?.token ?? '';
        acc += t;
        h.onToken(t);
      }),
      emitter.addListener('onMnnDone', () => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        h.onDone(acc);
      }),
      emitter.addListener('onMnnError', (e: {error?: string}) => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        h.onError(e?.error ?? 'infer error');
      }),
    ];
    CatuneMnn.inferTextStream(prompt).catch((err: unknown) => {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      h.onError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      CatuneMnn.cancelInfer?.();
    };
  }

  // 回退：现有 inferText 一次性返回（异步后台，但非逐字）
  let cancelled = false;
  CatuneMnn.inferText?.(prompt)
    .then(r => {
      if (cancelled) {
        return;
      }
      const full = r?.rawOutput ?? '';
      if (full) {
        h.onToken(full);
      }
      h.onDone(full);
    })
    .catch((err: unknown) => {
      if (cancelled) {
        return;
      }
      h.onError(err instanceof Error ? err.message : String(err));
    });
  return () => {
    cancelled = true;
  };
}
