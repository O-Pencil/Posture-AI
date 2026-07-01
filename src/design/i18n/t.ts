/**
 * @file t.ts
 * @description 轻量 i18n 模板函数。语法：`{name}` 占位，转义用 `\{`。
 *   缺 key 时 dev 模式 console.warn 并返回 key.path。
 *
 * [WHO] 导出 `format` / `makeT`
 * [FROM] 依赖 ./types
 * [TO] 被 LocaleContext 包装成 useT() 钩子
 * [HERE] src/design/i18n/t.ts · 模板替换核心
 */
import type {Dict, TVars} from './types';

/**
 * 渲染模板：
 *   format('Hello, {name}!', {name: 'Ada'}) → 'Hello, Ada!'
 *   format('Escaped \\{name}', {})           → 'Escaped {name}'
 */
export function format(template: string, vars: TVars = {}): string {
  return template.replace(/\\?\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (match.startsWith('\\')) {
      return `{${key}}`;
    }
    if (key in vars) {
      return String(vars[key]);
    }
    return `{${key}}`;
  });
}

/**
 * 工厂：根据当前 locale dict 返回 t 函数。
 *   缺 key 行为：dev 警告 + 返回 key；prod 静默返回 key。
 */
export function makeT(dict: Dict, locale: string, isDev: boolean) {
  return function t(key: string, vars?: TVars): string {
    const tmpl = dict[key];
    if (tmpl === undefined) {
      if (isDev) {
        console.warn(`[i18n] missing key "${key}" in locale "${locale}"`);
      }
      return key;
    }
    return vars ? format(tmpl, vars) : tmpl;
  };
}
