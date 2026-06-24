#!/usr/bin/env python3
"""生成左右分屏标签条 PNG（不依赖 ffmpeg drawtext）。"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# 字幕底与视频画布底的距离（px），避免和原生视频进度条重叠
SUBTITLE_BOTTOM_MARGIN = 96


def subtitle_overlay_y(canvas_h: int, sub_h: int) -> int:
    """根据画布高和字幕条高，算出 overlay 用的 y 坐标（已含底距）。"""
    return canvas_h - sub_h - SUBTITLE_BOTTOM_MARGIN


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def make_label(text: str, out: Path, *, align: str = "left") -> None:
    w, h = 960, 72
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((16, 12, w - 16, h - 8), radius=12, fill=(0, 0, 0, 150))
    font = load_font(34)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if align == "right":
        x = w - 32 - tw
    else:
        x = 32
    y = (h - th) // 2 - 2
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def make_slate(title: str, subtitle: str, out: Path) -> None:
    w, h = 960, 1080
    img = Image.new("RGB", (w, h), (20, 24, 32))
    draw = ImageDraw.Draw(img)
    font_t = load_font(44)
    font_s = load_font(28)
    for text, font, y in [
        (title, font_t, h // 2 - 70),
        (subtitle, font_s, h // 2 + 10),
    ]:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((w - tw) // 2, y), text, fill=(220, 220, 220) if font == font_t else (140, 140, 140), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def make_subtitle_bar(text, out: Path, *, width: int = 1920) -> int:
    """底部字幕条（全宽）。

    单行 100px / 双行 200px / 三行 300px（保持字号 32pt 一致）。
    返回实际高度，调用方用于 overlay 定位（避免覆盖视频内容）。
    """
    if isinstance(text, str):
        lines = [text]
    else:
        lines = list(text)
    n = len(lines)
    h = 100 * n
    img = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((24, 12, width - 24, h - 8), radius=10, fill=(0, 0, 0, 175))
    font = load_font(32)
    if n == 1:
        bbox = draw.textbbox((0, 0), lines[0], font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, 28), lines[0], fill=(255, 255, 255, 255), font=font)
    else:
        # 多行：垂直居中，行高 (h-24) // n
        block_h = h - 24
        slot = block_h // n
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            y = 12 + i * slot + (slot - th) // 2
            draw.text(((width - tw) // 2, y), line, fill=(255, 255, 255, 255), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return h


def render_sensor_arch_slide(out: Path) -> None:
    """硬件姿态带架构示意（右半屏素材）。"""
    w, h = 960, 1080
    img = Image.new("RGB", (w, h), (22, 26, 34))
    draw = ImageDraw.Draw(img)
    title_f = load_font(36)
    box_f = load_font(26)
    small_f = load_font(22)

    draw.text((48, 40), "硬件姿态带架构", fill=(210, 210, 210), font=title_f)

    boxes = [
        (120, 160, 720, 260, "ESP32-C6 + BNO085", "九轴 IMU · 颈/胸/腰节点"),
        (120, 340, 720, 440, "BLE 无线传输", "低延迟姿态帧"),
        (120, 520, 720, 620, "Catune App (Android)", "融合 · 校准 · 端侧推理"),
        (120, 700, 720, 800, "Desk 猫动 + 教练文案", "规则 + Qwen 端侧模型"),
    ]
    for x1, y1, x2, y2, t1, t2 in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=16, outline=(80, 120, 180), width=2, fill=(32, 38, 50))
        draw.text((x1 + 24, y1 + 20), t1, fill=(230, 230, 230), font=box_f)
        draw.text((x1 + 24, y1 + 58), t2, fill=(150, 160, 175), font=small_f)

    for y in (260, 440, 620):
        draw.line((480, y, 480, y + 50), fill=(100, 140, 200), width=3)
        draw.polygon([(470, y + 42), (490, y + 42), (480, y + 52)], fill=(100, 140, 200))

    draw.text((48, 900), "iPhone 姿态带可作为演示数据源", fill=(130, 140, 155), font=small_f)
    draw.text((48, 940), "复赛目标：ESP32 三节点 BLE 真链路", fill=(130, 140, 155), font=small_f)

    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["label", "slate", "subtitle"])
    p.add_argument("--text", default="")
    p.add_argument("--title", default="")
    p.add_argument("--subtitle", default="")
    p.add_argument("--align", choices=["left", "right"], default="left")
    p.add_argument("-o", "--out", required=True)
    args = p.parse_args()
    out = Path(args.out)
    if args.mode == "label":
        make_label(args.text, out, align=args.align)
    elif args.mode == "subtitle":
        make_subtitle_bar(args.text, out)
    else:
        make_slate(args.title, args.subtitle, out)


if __name__ == "__main__":
    main()
