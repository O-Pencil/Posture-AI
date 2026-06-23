/**
 * @file service.ts
 * @description 评估服务（后端无关）：按配置分派 端侧VL / 云端 / 预置，统一过安全链，失败回退预置。
 *   纪律（PRD §5.10）：模型输出经禁词链；核心闭环离线可用、云端可降级、现场不依赖网络。
 *   sanitize 当前默认 en；多语言场景下由调用方传入 locale。
 *
 * [WHO] 导出 `AssessService`/`createAssessService`
 * [FROM] 依赖 ./config、./preset、./cloudClient、./localVlClient、./types、../posture/engine(sanitize)、../ui/i18n(Locale)
 * [TO] 被 AssessScreen 调用（拍/选图 → assess）
 * [HERE] src/assess/service.ts · 评估分派服务
 */
import {type Locale} from '../ui/i18n';
import {sanitize} from '../posture/engine';
import {loadAssessConfig} from './config';
import {pickPreset} from './preset';
import {cloudAssess} from './cloudClient';
import {isLocalVlAvailable, localVlAssess} from './localVlClient';
import {AssessmentResult} from './types';

function safety(result: AssessmentResult, locale: Locale): AssessmentResult {
  return {
    ...result,
    summary: sanitize(result.summary, locale),
    suggestions: result.suggestions.map(s => sanitize(s, locale)),
  };
}

export type AssessService = {
  /** 传 base64 图片做评估；无图/失败/无后端时回退预置。 */
  assess: (imageBase64: string | null) => Promise<AssessmentResult>;
};

export function createAssessService(locale: Locale = 'en'): AssessService {
  return {
    async assess(imageBase64) {
      const cfg = await loadAssessConfig();
      // 诊断日志（Metro 控制台可见）：暴露实际生效的配置，避免 UI 显示与运行时不一致时无迹可循。
      console.warn('[assess] cfg', {
        backend: cfg.backend,
        apiKeyLen: cfg.cloud.apiKey.trim().length,
        apiKeyHead: cfg.cloud.apiKey.trim().slice(0, 4),
        baseURL: cfg.cloud.baseURL,
        model: cfg.cloud.model,
        hasImage: Boolean(imageBase64),
      });
      try {
        if (imageBase64) {
          if (cfg.backend === 'cloud' && cfg.cloud.apiKey.trim()) {
            console.warn('[assess] → cloud');
            return safety(await cloudAssess(cfg.cloud, imageBase64, locale), locale);
          }
          if (cfg.backend === 'local' && isLocalVlAvailable()) {
            console.warn('[assess] → local');
            return safety(await localVlAssess(imageBase64, locale), locale);
          }
        }
      } catch (e) {
        console.warn('[assess] backend failed, fall back to preset', e);
        // 网络/原生/解析失败 → 落到预置
      }
      console.warn('[assess] → preset (mock)');
      return safety(pickPreset(locale), locale);
    },
  };
}
