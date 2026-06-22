import {theme} from './theme';

/** AppShell 顶部安全区 / 状态栏背后区域背景：与当前 Tab 页面底色对齐。 */
export function shellBackgroundForTab(tab: string): string {
  return tab === 'plant' ? theme.colors.background : theme.colors.surface;
}
