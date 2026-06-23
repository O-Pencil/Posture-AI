"""
从 HF Trainer 的 trainer_state.json 画 train/eval loss 曲线（录视频/参赛材料用）。

用法：
  python training/plot_loss.py
  python training/plot_loss.py --state training/saves/qwen0.5b-catune-lora-v2 --out training/loss_curve.png

--state 可传 trainer_state.json 文件，或输出目录（自动找最新 checkpoint 的 trainer_state.json）。
依赖：matplotlib（pip install matplotlib）。标题/轴用英文避免 CJK 字体缺失出现方块。
"""
import argparse
import glob
import json
import os


def find_state(path: str) -> str:
    if os.path.isfile(path):
        return path
    direct = os.path.join(path, 'trainer_state.json')
    if os.path.isfile(direct):
        return direct
    cks = glob.glob(os.path.join(path, 'checkpoint-*', 'trainer_state.json'))
    if cks:
        # 取 step 最大的 checkpoint
        cks.sort(key=lambda p: int(p.split('checkpoint-')[1].split(os.sep)[0]))
        return cks[-1]
    raise SystemExit(f'✗ 找不到 trainer_state.json：{path}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--state', default='training/saves/qwen0.5b-catune-lora-v2')
    ap.add_argument('--out', default='training/loss_curve.png')
    args = ap.parse_args()

    state_path = find_state(args.state)
    with open(state_path, encoding='utf-8') as f:
        state = json.load(f)
    hist = state.get('log_history', [])

    tr_x, tr_y, ev_x, ev_y = [], [], [], []
    for e in hist:
        x = e.get('step', e.get('epoch'))
        if 'loss' in e and x is not None:
            tr_x.append(x)
            tr_y.append(e['loss'])
        if 'eval_loss' in e and x is not None:
            ev_x.append(x)
            ev_y.append(e['eval_loss'])

    if not tr_x and not ev_x:
        raise SystemExit(f'✗ log_history 里没有 loss / eval_loss：{state_path}')

    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    plt.figure(figsize=(7, 4.2), dpi=140)
    if tr_x:
        plt.plot(tr_x, tr_y, label='train loss', color='#bbbbbb', linewidth=1.5)
    if ev_x:
        plt.plot(ev_x, ev_y, label='eval loss', color='#FB4B00', marker='o', linewidth=2)
        plt.annotate(f'{ev_y[-1]:.3f}', (ev_x[-1], ev_y[-1]),
                     textcoords='offset points', xytext=(6, 6),
                     color='#FB4B00', fontweight='bold')
    plt.xlabel('step')
    plt.ylabel('loss')
    plt.title('Catune LoRA fine-tune loss')
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(args.out)
    print(f'✓ 已保存曲线：{args.out}  (train {len(tr_x)} 点 / eval {len(ev_y)} 点)')
    if ev_y:
        print(f'  eval_loss: {ev_y[0]:.3f} → {ev_y[-1]:.3f}')


if __name__ == '__main__':
    main()
