/**
 * @file cloudClient.ts
 * @description 云端体态评估：调用 OpenAI/DashScope 兼容的 VL chat/completions，传 base64 图片，解析结构化结果。
 *
 * [WHO] 导出 `cloudAssess`
 * [FROM] 依赖 ./types、./parse、全局 fetch
 * [TO] 被 src/assess/service.ts 在 backend=cloud 且有 Key 时调用
 * [HERE] src/assess/cloudClient.ts · 云端 VL 评估客户端
 */
import {AssessmentResult, CloudConfig} from './types';
import {buildAssessSystem, buildAssessUser, parseAssessJson} from './parse';
import type {Locale} from '../ui/i18n';

export async function cloudAssess(
  cfg: CloudConfig,
  imageBase64: string,
  locale: Locale = 'en',
  mime = 'image/jpeg',
): Promise<AssessmentResult> {
  const res = await fetch(`${cfg.baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      messages: [
        {role: 'system', content: buildAssessSystem(locale)},
        {
          role: 'user',
          content: [
            {type: 'text', text: buildAssessUser(locale)},
            {type: 'image_url', image_url: {url: `data:${mime};base64,${imageBase64}`}},
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.warn('[assess] cloud http error', {
      status: res.status,
      url: `${cfg.baseURL.replace(/\/$/, '')}/chat/completions`,
      body: errBody.slice(0, 500),
    });
    throw new Error(`cloud assess failed: ${res.status}`);
  }
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  return {source: 'cloud', ...parseAssessJson(text, locale), raw: text};
}
