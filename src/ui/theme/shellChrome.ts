import {theme} from './theme';
import {PLANT_SCENE_BG} from '../components/PlantHeroScene';

/** AppShell 顶部安全区 / 状态栏背后区域背景：与当前 Tab 页面底色对齐。 */
export function shellBackgroundForTab(tab: string): string {
  // Plant 页仅状态栏区与 bg-plant 顶部灰底衔接；页面主体为白色
  return tab === 'plant' ? PLANT_SCENE_BG : theme.colors.surface;
}
