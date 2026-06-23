"""
基线 vs 微调 对比脚本（v2）。

修正点（为什么旧版"100% 一致"）：
  `PeftModel.from_pretrained(base_model, LORA)` 会**原地改写 base_model**（注入 LoRA 层），
  之后再 `gen(base_model)` 与 `gen(peft_model)` 跑的其实是**同一个带适配器的模型** → 输出当然一致。
  正确做法：同一个 peft_model，用 `disable_adapter()` 上下文得到真·基座输出，启用时得到微调输出。

新增：
  - LORA 路径默认指向 v2（可 --lora 覆盖），并校验 adapter 真的加载（active_adapters / 配置 / logit 差异）。
  - 指标化评测：平均字数、带 [动作:] 标签比例、超 30 字比例、禁词命中率、与基座完全一致条数。

用法：
  python training/compare.py
  python training/compare.py --lora training/saves/qwen0.5b-catune-lora-v2
"""
import argparse
import os

os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE = 'Qwen/Qwen2.5-0.5B-Instruct'

INSTRUCTION = (
    "你是温和的坐姿教练（一只爱操心的猫）。根据姿态信息，用一句不超过30字、有温度、指向具体动作、"
    "不做医疗诊断、句尾带「喵～」的中文提醒用户调整坐姿；最后用 [动作:xxx] 标注一个建议动作。"
)

# 与 src/posture/engine.ts BANNED_WORDS 对齐
BANNED = [
    '确诊', '诊断为', '患有', '综合征',
    '治疗', '治愈', '药物', '手术', '注射', '贴片',
    '保证', '一定', '100%', '彻底', '永远',
    '限时', '优惠', '推荐购买', '扫码',
]

TEST_CASES = [
    '姿态：头前倾（TECH_NECK）；颈前倾约25°；已持续12分钟。',
    '姿态：驼背（SLUMPED）；胸椎后凸约18°；已持续8分钟。',
    '姿态：身体左倾（LEFT_LEAN）；腰椎侧倾约-15°；已持续10分钟。',
    '姿态：身体右倾（RIGHT_LEAN）；腰椎侧倾约16°；已持续10分钟。',
    '姿态：正常（NORMAL）；脊柱接近中立；已持续5分钟。',
    # 带记忆前缀（训练已混入 30%），验证个性化是否被吃进去
    '已知用户：偏好鼓励式提醒。\n姿态：驼背（SLUMPED）；胸椎后凸约24°；已持续15分钟。',
    '已知用户：希望少打扰、必要时再提醒。\n姿态：头前倾（TECH_NECK）；颈前倾约28°；已持续25分钟。',
]


def build_prompt(user_text: str) -> str:
    return (
        f"<|im_start|>system\n{INSTRUCTION}<|im_end|>\n"
        f"<|im_start|>user\n{user_text}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )


def gen(model, tok, user_text: str) -> str:
    inputs = tok(build_prompt(user_text), return_tensors='pt')
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=80, do_sample=False, pad_token_id=tok.eos_token_id)
    text = tok.decode(out[0], skip_special_tokens=False)
    if '<|im_start|>assistant\n' in text:
        text = text.split('<|im_start|>assistant\n', 1)[1]
    if '<|im_end|>' in text:
        text = text.split('<|im_end|>', 1)[0]
    return text.strip()


def body_of(text: str) -> str:
    return text.split(' [动作', 1)[0].split('[动作', 1)[0]


def metrics(outputs):
    n = len(outputs)
    bodies = [body_of(o) for o in outputs]
    return {
        'avg_len': round(sum(len(b) for b in bodies) / n, 1),
        'tag_rate': round(sum('[动作' in o for o in outputs) / n, 2),
        'over30_rate': round(sum(len(b) > 30 for b in bodies) / n, 2),
        'banned_rate': round(sum(any(w in o for w in BANNED) for o in outputs) / n, 2),
    }


def md_cell(s: str) -> str:
    """转义 Markdown 表格单元格（去换行、转义竖线）。"""
    return s.replace('\\', '\\\\').replace('|', '\\|').replace('\n', ' / ').strip()


def write_markdown(path, args, diff, cases, base_outs, lora_outs, mb, ml, identical):
    """把 A/B 对照 + 指标表写成干净 Markdown（录视频/参赛材料截图用）。"""
    L = []
    L.append('# 基座 vs 微调（LoRA）对比\n')
    L.append(f'- 基座：`{args.base}`')
    L.append(f'- 微调：`{os.path.basename(args.lora)}`')
    L.append(f'- adapter 生效校验：logits |Δ|max = **{diff:.4f}** '
             + ('✓ 生效（确为两个不同模型）' if diff > 1e-4 else '⚠ 几乎无差异，疑似未训到/未加载'))
    L.append(f'- 与基座完全一致：**{identical}/{len(cases)}** 条\n')
    L.append('## 逐条对照')
    L.append('| # | 输入 | 基座输出 | 微调版输出 |')
    L.append('| --- | --- | --- | --- |')
    for i, (tc, b, l) in enumerate(zip(cases, base_outs, lora_outs), 1):
        L.append(f'| {i} | {md_cell(tc)} | {md_cell(b)} | {md_cell(l)} |')
    L.append('\n## 指标汇总（带标签↑、超30字↓、禁词→0）')
    L.append('| 模型 | 平均字数 | 带[动作]标签 | 超30字 | 禁词 |')
    L.append('| --- | --- | --- | --- | --- |')
    L.append(f'| 基座 | {mb["avg_len"]} | {mb["tag_rate"]} | {mb["over30_rate"]} | {mb["banned_rate"]} |')
    L.append(f'| 微调 | {ml["avg_len"]} | {ml["tag_rate"]} | {ml["over30_rate"]} | {ml["banned_rate"]} |')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=BASE)
    ap.add_argument('--lora', default='training/saves/qwen0.5b-catune-lora-v2')
    ap.add_argument('--md', default=None, help='额外把对比与指标写成 Markdown 表格到此路径（录视频/材料用）')
    args = ap.parse_args()

    print('>>> Loading tokenizer')
    tok = AutoTokenizer.from_pretrained(args.base, trust_remote_code=True)

    print(f'>>> Loading BASE ({args.base}) on CPU...')
    model = AutoModelForCausalLM.from_pretrained(args.base, trust_remote_code=True, dtype=torch.float32)
    model.eval()

    print(f'>>> Attaching LoRA adapter: {args.lora}')
    if not os.path.exists(os.path.join(args.lora, 'adapter_config.json')):
        raise SystemExit(f'✗ 找不到 adapter_config.json，路径不对：{args.lora}')
    peft_model = PeftModel.from_pretrained(model, args.lora)
    peft_model.eval()
    print(f'    active_adapters = {getattr(peft_model, "active_adapters", "?")}')
    print(f'    peft_config keys = {list(peft_model.peft_config.keys())}')

    # 校验 adapter 真的在起作用：启用/禁用下同一 prompt 的末位 logits 差异应 > 0
    inputs = tok(build_prompt(TEST_CASES[0]), return_tensors='pt')
    with torch.no_grad():
        logits_on = peft_model(**inputs).logits[0, -1]
        with peft_model.disable_adapter():
            logits_off = peft_model(**inputs).logits[0, -1]
    diff = (logits_on - logits_off).abs().max().item()
    print(f'    adapter logits |Δ|max = {diff:.4f}  ({"✓ 生效" if diff > 1e-4 else "⚠ 几乎无差异，疑似未训到/未加载"})')

    print('\n' + '=' * 72)
    print(f'对比：基座 {args.base}  vs  LoRA({os.path.basename(args.lora)})')
    print('=' * 72)

    base_outs, lora_outs, identical = [], [], 0
    for i, tc in enumerate(TEST_CASES, 1):
        with peft_model.disable_adapter():
            base_out = gen(peft_model, tok, tc)  # 真·基座（禁用 adapter）
        lora_out = gen(peft_model, tok, tc)  # 微调（启用 adapter）
        base_outs.append(base_out)
        lora_outs.append(lora_out)
        same = base_out == lora_out
        identical += int(same)
        print(f'\n--- 测试 {i} ---\n输入: {tc.replace(chr(10), " / ")}')
        print(f'基座   ({len(body_of(base_out))}字): {base_out}')
        print(f'微调版 ({len(body_of(lora_out))}字): {lora_out}' + ('   [与基座一致]' if same else ''))

    mb, ml = metrics(base_outs), metrics(lora_outs)
    print('\n' + '=' * 72)
    print('指标汇总（越贴风格越好：tag_rate↑、over30_rate↓、banned_rate→0）')
    print(f'{"":8}{"avg字数":>8}{"带标签":>8}{"超30字":>8}{"禁词":>8}')
    print(f'{"基座":8}{mb["avg_len"]:>8}{mb["tag_rate"]:>8}{mb["over30_rate"]:>8}{mb["banned_rate"]:>8}')
    print(f'{"微调":8}{ml["avg_len"]:>8}{ml["tag_rate"]:>8}{ml["over30_rate"]:>8}{ml["banned_rate"]:>8}')
    print(f'\n与基座完全一致: {identical}/{len(TEST_CASES)} 条')

    if args.md:
        write_markdown(args.md, args, diff, TEST_CASES, base_outs, lora_outs, mb, ml, identical)
        print(f'\n✓ 已写出 Markdown 对比表：{args.md}')


if __name__ == '__main__':
    main()
