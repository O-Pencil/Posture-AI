/**
 * @file exercises.ts
 * @description 跟练例程数据：每个建议动作（PostureAction）对应一套引导式训练（保持/放松 × 次数 + 步骤）。
 *   初赛为预置内容；复赛可由模型/记忆个性化生成。被 Desk 建议动作 chip 点击后弹出的 TrainingScreen 消费。
 *
 * [WHO] 导出 `Exercise`、`EXERCISES`、`exerciseFor`
 * [FROM] 依赖 ./types(PostureAction)
 * [TO] 被 src/ui/screens/TrainingScreen.tsx 消费
 * [HERE] src/posture/exercises.ts · 跟练例程数据
 */
import {PostureAction} from './types';

export type Exercise = {
  action: PostureAction;
  title: string;
  intro: string;
  /** 重复次数。 */
  reps: number;
  /** 每次保持秒数。 */
  holdSec: number;
  /** 每次之间放松秒数（最后一次后不放松）。 */
  restSec: number;
  steps: string[];
};

export const EXERCISES: Partial<Record<PostureAction, Exercise>> = {
  NECK_RETRACTION: {
    action: 'NECK_RETRACTION',
    title: '颈部回缩',
    intro: '缓解头前倾，让头回到肩膀正上方。',
    reps: 5,
    holdSec: 5,
    restSec: 3,
    steps: ['坐直，眼睛平视前方', '下巴水平往后收，像挤出双下巴', '感觉后颈被拉长，保持', '缓慢放松回到中立'],
  },
  THORACIC_EXTENSION: {
    action: 'THORACIC_EXTENSION',
    title: '胸椎伸展',
    intro: '打开含胸驼背，挺起上背。',
    reps: 5,
    holdSec: 6,
    restSec: 3,
    steps: ['坐直，双手轻搭后脑', '胸口向斜上方顶出', '肩胛向后向下收，保持', '吸气挺胸、呼气放松'],
  },
  SCAPULAR_RETRACTION: {
    action: 'SCAPULAR_RETRACTION',
    title: '肩胛收紧',
    intro: '收紧肩胛，稳住上背姿态。',
    reps: 6,
    holdSec: 4,
    restSec: 2,
    steps: ['坐直，双臂自然下垂', '想象把两侧肩胛骨向脊柱中间夹', '向后向下收紧，保持', '缓慢放松'],
  },
  WEIGHT_CENTERING: {
    action: 'WEIGHT_CENTERING',
    title: '重心摆正',
    intro: '纠正身体侧倾，左右均衡受力。',
    reps: 4,
    holdSec: 5,
    restSec: 3,
    steps: ['双脚平放、与肩同宽', '感受坐骨两侧均匀受力', '骨盆坐正、肩膀放平，保持', '轻轻放松，保持居中'],
  },
  STAND_BREAK: {
    action: 'STAND_BREAK',
    title: '起身活动',
    intro: '久坐了，起身走动放松一下。',
    reps: 1,
    holdSec: 60,
    restSec: 0,
    steps: ['站起身，离开座位', '走动几步、喝口水', '轻轻转转脖子和肩膀', '准备好再坐回来'],
  },
};

export function exerciseFor(action: PostureAction | null | undefined): Exercise | null {
  if (!action) {
    return null;
  }
  return EXERCISES[action] ?? null;
}
