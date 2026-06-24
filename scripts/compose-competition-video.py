#!/usr/bin/env python3
"""
Catune 参赛演示片 · 分段合成

流程:
  1. list              查看段落清单
  2. build <id>        只生成单段 → mp4/segments/<id>.mp4
  3. build --all       生成全部段落
  4. merge             合并 mp4/segments/*.mp4 → Catune-参赛演示-1920x1080.mp4
  5. all               build --all + merge

第一次猫动对齐: 编辑 mp4/segments/config/03_cat1.json 调整左右 start/dur
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from shutil import which
from typing import Any, Callable

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mp4"
SEGMENTS_DIR = SRC / "segments"
CONFIG_DIR = SEGMENTS_DIR / "config"
OUT = SRC / "Catune-参赛演示-1920x1080.mp4"
WORK = SRC / ".compose-tmp"
FPS = 30
XFADE = 0.45

SEGMENT_ORDER = [
    "00_open", "01_launch", "02_model", "03_cat1", "04_cat2",
    "05_ai", "06_train", "07_plant", "08_evidence", "09_bench",
    "10_sme2", "11_sensor", "12_lora", "13_close",
]

_label_spec = importlib.util.spec_from_file_location(
    "compose_video_label", Path(__file__).parent / "compose-video-label.py"
)
_label = importlib.util.module_from_spec(_label_spec)
assert _label_spec.loader is not None
_label_spec.loader.exec_module(_label)
load_font = _label.load_font
make_label = _label.make_label
make_subtitle_bar = _label.make_subtitle_bar
render_sensor_arch_slide = _label.render_sensor_arch_slide


def seg_work(seg_id: str) -> Path:
    p = WORK / seg_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def run(cmd: list[str], *, quiet: bool = True) -> None:
    kw: dict = {"check": True}
    if quiet:
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, **kw)


def probe_dur(path: Path) -> float:
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", str(path),
            ],
            text=True,
        ).strip()
        return float(out) if out and out != "N/A" else 0.0
    except (subprocess.CalledProcessError, ValueError):
        return 0.0


def concat_videos(inputs: list[Path], out: Path) -> None:
    lst = out.with_suffix(".txt")
    lst.write_text("\n".join(f"file '{p.resolve()}'" for p in inputs) + "\n", encoding="utf-8")
    run([
        "ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", str(lst),
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-r", str(FPS), "-an", str(out),
    ])


def extract_clip(inp: Path, out: Path, start: float, dur: float, *, speed: float = 1.0) -> None:
    """截取素材；speed<1 为慢放（0.5 即半速，输出时长约为 dur/speed）。"""
    if abs(speed - 1.0) < 1e-6:
        run([
            "ffmpeg", "-y", "-hide_banner", "-ss", f"{start:.3f}", "-i", str(inp),
            "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-r", str(FPS), "-an", str(out),
        ])
        return
    pts = 1.0 / speed
    out_dur = dur / speed
    run([
        "ffmpeg", "-y", "-hide_banner", "-ss", f"{start:.3f}", "-i", str(inp),
        "-vf", f"trim=duration={dur:.3f},setpts=PTS-STARTPTS,setpts={pts:.6f}*PTS",
        "-t", f"{out_dur:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-r", str(FPS), "-an", str(out),
    ])


def center_clip(
    inp: Path, out: Path, *, start: float = 0.0, dur: float | None = None, subtitle: str = "",
    speed: float = 1.0, width: int = 1920, height: int = 1080, work: Path | None = None,
) -> float:
    wdir = work or WORK
    (wdir / "subs").mkdir(parents=True, exist_ok=True)
    sub_png = wdir / "subs" / f"{out.stem}_sub.png"
    sub_h = make_subtitle_bar(subtitle, sub_png, width=width) if subtitle else 0
    src = inp
    d = dur if dur is not None else (probe_dur(inp) or 4.0)
    # speed != 1.0：先抽帧变速到临时文件，再走正常 pipeline（start=0, dur=d/speed）
    if abs(speed - 1.0) > 1e-6:
        tmp = wdir / f"center_{out.stem}_spd.mp4"
        extract_clip(inp, tmp, start, d, speed=speed)
        src = tmp
        start = 0.0
        d = d / speed
    fade_out_st = max(0.0, d - 0.35)
    # trim 放在 vf 开头，保证多路输入（带字幕 overlay）时时长严格生效
    vf = (
        f"trim=duration={d:.3f},setpts=PTS-STARTPTS,"
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,"
        f"fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out_st:.3f}:d=0.35"
    )
    cmd = ["ffmpeg", "-y", "-hide_banner"]
    if start > 0:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", str(src)]
    if subtitle:
        cmd += [
            "-i", str(sub_png),
            "-filter_complex", f"[0:v]{vf}[base];[base][1:v]overlay=0:{_label.subtitle_overlay_y(height, sub_h)}[v]",
            "-map", "[v]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-r", str(FPS), "-an", str(out),
        ]
    else:
        cmd += ["-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "20",
                "-r", str(FPS), "-an", str(out)]
    run(cmd)
    return d


def img_clip(
    img: Path, out: Path, dur: float, subtitle: str = "",
    *, full_width: bool = True, work: Path | None = None,
) -> float:
    wdir = work or WORK
    w, h = (1920, 1080) if full_width else (960, 1080)
    fade_out_st = max(0.0, dur - 0.25)
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,"
        f"fade=t=in:st=0:d=0.25,fade=t=out:st={fade_out_st:.3f}:d=0.25"
    )
    if subtitle:
        (wdir / "subs").mkdir(parents=True, exist_ok=True)
        sub_png = wdir / "subs" / f"{out.stem}_sub.png"
        sub_h = make_subtitle_bar(subtitle, sub_png)
        overlay_y = _label.subtitle_overlay_y(h, sub_h)
        run([
            "ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", str(img),
            "-i", str(sub_png), "-t", f"{dur:.3f}",
            "-filter_complex", f"[0:v]{vf}[base];[base][1:v]overlay=0:{overlay_y}[v]",
            "-map", "[v]", "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-r", str(FPS), "-an", str(out),
        ])
    else:
        run([
            "ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", str(img), "-t", f"{dur:.3f}",
            "-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-r", str(FPS), "-an", str(out),
        ])
    return dur


def half_clip(
    inp: Path, out: Path, label: str, *, dur: float | None = None,
    align: str = "left", work: Path | None = None,
) -> float:
    wdir = work or WORK
    labels = wdir / "labels"
    labels.mkdir(parents=True, exist_ok=True)
    lp = labels / f"{out.stem}_lbl.png"
    make_label(label, lp, align=align)
    inp_d = probe_dur(inp) or 0.0
    d = dur if dur is not None else (inp_d or 5.0)
    pad_extra = max(0.0, d - inp_d)
    fade_out_st = max(0.0, d - 0.3)
    run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(inp), "-i", str(lp),
        "-filter_complex",
        (
            f"[0:v]scale=960:1080:force_original_aspect_ratio=decrease,"
            f"tpad=stop_mode=clone:stop_duration={pad_extra:.3f},"
            f"pad=960:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,"
            f"fade=t=in:st=0:d=0.3,fade=t=out:st={fade_out_st:.3f}:d=0.3[base];"
            "[base][1:v]overlay=0:24[v]"
        ),
        "-map", "[v]", "-t", f"{d:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-r", str(FPS), "-an", str(out),
    ])
    return d


def hstack_clips(
    left: Path, right: Path, out: Path, subtitle: str, *, work: Path | None = None,
) -> float:
    wdir = work or WORK
    dl, dr = probe_dur(left), probe_dur(right)
    d = max(dl, dr, 0.1)
    (wdir / "subs").mkdir(parents=True, exist_ok=True)
    sub_png = wdir / "subs" / f"{out.stem}_sub.png"
    sub_h = make_subtitle_bar(subtitle, sub_png)
    fade_out_st = max(0.0, d - 0.35)
    overlay_y = _label.subtitle_overlay_y(1080, sub_h)
    run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(left), "-i", str(right), "-i", str(sub_png),
        "-filter_complex",
        (
            f"[0:v]tpad=stop_mode=clone:stop_duration={max(0.0, d - dl):.3f}[L];"
            f"[1:v]tpad=stop_mode=clone:stop_duration={max(0.0, d - dr):.3f}[R];"
            "[L][R]hstack=inputs=2[hs];"
            f"[hs]fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out_st:.3f}:d=0.35[base];"
            f"[base][2:v]overlay=0:{overlay_y}[v]"
        ),
        "-map", "[v]", "-t", f"{d:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-r", str(FPS), "-an", str(out),
    ])
    return d


def make_brand_card(out: Path, title: str, subtitle: str, dur: float = 3.0, work: Path | None = None) -> float:
    wdir = work or WORK
    img = Image.new("RGB", (1920, 1080), (12, 14, 20))
    draw = ImageDraw.Draw(img)
    ft, fs = load_font(88), load_font(38)
    for text, font, y, color in [
        (title, ft, 420, (255, 255, 255)),
        (subtitle, fs, 540, (160, 170, 190)),
    ]:
        tw = draw.textlength(text, font=font)
        draw.text(((1920 - tw) / 2, y), text, fill=color, font=font)
    png = wdir / f"{out.stem}_card.png"
    img.save(png)
    fade_out = max(0.0, dur - 0.4)
    run([
        "ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", str(png), "-t", f"{dur:.3f}",
        "-vf", f"fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out:.3f}:d=0.4",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-r", str(FPS), "-an", str(out),
    ])
    return dur



def load_seg_config(seg_id: str) -> dict[str, Any] | None:
    path = CONFIG_DIR / f"{seg_id}.json"
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def _load_lora_module():
    spec = importlib.util.spec_from_file_location(
        "compose_lora_slides", Path(__file__).parent / "compose-lora-slides.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def segment_output(seg_id: str) -> Path:
    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)
    return SEGMENTS_DIR / f"{seg_id}.mp4"


def write_segment_meta(seg_id: str, out: Path, dur: float, extra: dict | None = None) -> None:
    manifest_path = SEGMENTS_DIR / "manifest.json"
    manifest: dict[str, Any] = {}
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    prev = manifest.get(seg_id, {}) if isinstance(manifest.get(seg_id), dict) else {}
    meta = {
        **prev,
        "id": seg_id,
        "file": str(out.relative_to(ROOT)),
        "duration": dur,
        "built": True,
    }
    if extra:
        meta.update(extra)
    manifest[seg_id] = meta
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


# --- 各段落构建 ---

def build_brand_from_config(seg_id: str, work: Path, out: Path, defaults: dict[str, Any]) -> float:
    cfg = load_seg_config(seg_id) or {}
    title = cfg.get("card_title", defaults["card_title"])
    subtitle = cfg.get("card_subtitle", defaults["card_subtitle"])
    dur = float(cfg.get("dur", defaults["dur"]))
    return make_brand_card(out, title, subtitle, dur=dur, work=work)


def build_center_from_config(seg_id: str, work: Path, out: Path, defaults: dict[str, Any]) -> float:
    cfg = load_seg_config(seg_id) or {}
    src = SRC / cfg.get("source", defaults["source"])
    dur = float(cfg.get("dur", defaults["dur"]))
    start = float(cfg.get("start", defaults.get("start", 0.0)))
    speed = float(cfg.get("speed", 1.0))
    subtitle = cfg.get("subtitle", defaults.get("subtitle", ""))
    return center_clip(src, out, start=start, dur=dur, subtitle=subtitle, speed=speed, work=work)


def build_00_open(work: Path, out: Path) -> float:
    return build_brand_from_config("00_open", work, out, {
        "card_title": "CATUNE",
        "card_subtitle": "久坐办公人群的端侧姿态管理 APP",
        "dur": 3.0,
    })


def build_01_launch(work: Path, out: Path) -> float:
    return build_center_from_config("01_launch", work, out, {
        "source": "安卓模拟器启动.webm",
        "dur": 8.0,
        "subtitle": "端侧 AI 坐姿助手 · 本地启动",
    })


def build_02_model(work: Path, out: Path) -> float:
    return build_center_from_config("02_model", work, out, {
        "source": "安卓模拟器下载模型视频.webm",
        "dur": 10.0,
        "subtitle": "按机型智能推荐 · 支持本地下载 · 0.5B / 1.7B / VL 三款 · 源码可查",
    })


def _part_speed(part: dict[str, Any], side_default: float) -> float:
    """part.speed 优先，否则用 left/right 级 speed。"""
    if "speed" in part:
        return float(part["speed"])
    return side_default


def _build_side_parts(
    parts: list[dict[str, Any]],
    work: Path,
    prefix: str,
    side_default_speed: float,
    *,
    default_src: Path | None = None,
) -> tuple[Path, float]:
    """拼接一侧多段素材，返回 concat 路径与播放总时长。"""
    clips: list[Path] = []
    play_dur = 0.0
    for i, part in enumerate(parts):
        c = work / f"{prefix}{i}.mp4"
        pd = float(part["dur"])
        spd = _part_speed(part, side_default_speed)
        src = SRC / part["file"] if "file" in part else default_src
        if src is None:
            raise ValueError(f"{prefix} part {i} 缺少 file 或 default_src")
        extract_clip(src, c, float(part["start"]), pd, speed=spd)
        clips.append(c)
        play_dur += pd / spd
    out = work / f"{prefix}concat.mp4"
    concat_videos(clips, out)
    return out, play_dur


def build_03_cat1(work: Path, out: Path) -> float:
    cfg = load_seg_config("03_cat1") or {}
    subtitle = cfg.get("subtitle", "佩戴姿态带 · 低头抬头与左右摇摆 · 颈胸腰实时联动")
    left_label = cfg.get("left_label", "佩戴姿态带 · 真人")
    right_label = cfg.get("right_label", "iOS · 猫动同步")

    left_cfg = cfg.get("left", {})
    left_default_speed = float(left_cfg.get("speed", 1.0))
    left_src = SRC / left_cfg.get("source", "人佩戴-4秒.mp4")
    left_parts = left_cfg.get("parts", [
        {"start": 0.0, "dur": 2.0}, {"start": 2.0, "dur": 2.0},
    ])
    left_concat, left_play_dur = _build_side_parts(
        left_parts, work, "L", left_default_speed, default_src=left_src,
    )

    right_cfg = cfg.get("right", {})
    right_default_speed = float(right_cfg.get("speed", 1.0))
    right_parts = right_cfg.get("parts", [
        {"file": "苹果猫低头抬头（剪4秒）.mp4", "start": 0.0, "dur": 2.0},
        {"file": "苹果猫左右摇摆.mp4", "start": 0.0, "dur": 2.0},
    ])
    right_concat, right_play_dur = _build_side_parts(
        right_parts, work, "R", right_default_speed,
    )

    if "total_dur" in cfg:
        total = float(cfg["total_dur"])
    else:
        total = max(left_play_dur, right_play_dur, 4.0)

    half_clip(left_concat, work / "L_half.mp4", left_label, dur=total, work=work)
    half_clip(right_concat, work / "R_half.mp4", right_label, dur=total, align="right", work=work)
    d = hstack_clips(work / "L_half.mp4", work / "R_half.mp4", out, subtitle, work=work)

    meta = {
        **cfg,
        "_computed": {"left_play_dur": round(left_play_dur, 3), "right_play_dur": round(right_play_dur, 3), "total_dur": total},
    }
    (work / "applied_config.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"    左侧播放时长 {left_play_dur:.2f}s · 右侧 {right_play_dur:.2f}s · 成片 {total:.2f}s")
    return d


def build_04_cat2(work: Path, out: Path) -> float:
    cfg = load_seg_config("04_cat2") or {}
    total = float(cfg.get("total_dur", 12.0))
    seg_subtitle = cfg.get("subtitle", "姿态信号进 · 端侧模型输出教练文案 · 全部本地完成")
    left_label = cfg.get("left_label", "Monitor · 推理日志")
    right_label = cfg.get("right_label", "Android · 端侧模型输出")

    left_cfg = cfg.get("left", {})
    left_src = SRC / left_cfg.get("source", "安卓监控页面.mp4")
    left_start = float(left_cfg.get("start", 0.0))
    left_dur = float(left_cfg.get("dur", total))
    left_clip_path = work / "L_raw.mp4"
    extract_clip(left_src, left_clip_path, left_start, left_dur)
    half_clip(left_clip_path, work / "L_half.mp4", left_label, dur=total, work=work)

    right_cfg = cfg.get("right", {})
    right_parts = right_cfg.get("parts", [])
    right_concat, _ = _build_side_parts(right_parts, work, "R", 1.0)
    half_clip(right_concat, work / "R_half.mp4", right_label, dur=total, align="right", work=work)

    return hstack_clips(
        work / "L_half.mp4", work / "R_half.mp4", out, seg_subtitle, work=work,
    )


def build_05_ai(work: Path, out: Path) -> float:
    return build_center_from_config("05_ai", work, out, {
        "source": "苹果AI姿态评估（取前15秒）.mp4",
        "dur": 14.0,
        "subtitle": "AI 姿态评估 · 可配置云端多模态模型",
    })


def build_06_train(work: Path, out: Path) -> float:
    return build_center_from_config("06_train", work, out, {
        "source": "苹果-跟练（13秒）.mp4",
        "dur": 13.0,
        "subtitle": "跟练模式 · 跟着猫教练矫正坐姿",
    })


def build_07_plant(work: Path, out: Path) -> float:
    return build_center_from_config("07_plant", work, out, {
        "source": "安卓模拟器植物页+日报周报.webm",
        "dur": 10.0,
        "subtitle": "坚持好坐姿植物会长大 · 日报周报复盘",
    })


def build_08_evidence(work: Path, out: Path) -> float:
    return build_brand_from_config("08_evidence", work, out, {
        "card_title": "技术证明材料",
        "card_subtitle": "以下内容为可复查的端侧性能、硬件方案与模型训练证据",
        "dur": 3.5,
    })


def build_09_bench(work: Path, out: Path) -> float:
    cfg = load_seg_config("09_bench") or {}
    seg_subtitle = cfg.get("subtitle", "小米14 真机端侧基准 · tok/s · 首字延迟 · backend")
    slides = cfg.get("slides", [])
    if not slides:
        slides = [
            {"file": "安卓模型基准测试1.jpg", "dur": 4.0},
            {"file": "安卓模型基准测试2.jpg", "dur": 4.0},
        ]
    parts: list[Path] = []
    total = 0.0
    for i, slide in enumerate(slides, 1):
        d = float(slide.get("dur", 4.0))
        sub = slide.get("subtitle", seg_subtitle)
        bp = work / f"bench_{i}.mp4"
        img_clip(SRC / slide["file"], bp, d, subtitle=sub, work=work)
        parts.append(bp)
        total += d
    concat_videos(parts, out)
    return total


def build_10_sme2(work: Path, out: Path) -> float:
    cfg = load_seg_config("10_sme2") or {}
    parts_cfg = cfg.get("parts", [])
    parts: list[Path] = []
    total = 0.0
    for i, part in enumerate(parts_cfg, 1):
        d = float(part.get("dur", 2.5))
        sub = part.get("subtitle", "MNN 已集成 SME2/KleidiAI 编译开关")
        file_name = part["file"]
        sp = work / f"sme_{i}.mp4"
        if part.get("type") == "video":
            center_clip(SRC / file_name, sp, start=float(part.get("start", 0.0)), dur=d, subtitle=sub, work=work)
        else:
            img_clip(SRC / file_name, sp, d, subtitle=sub, work=work)
        parts.append(sp)
        total += d
    concat_videos(parts, out)
    return total


def build_11_sensor(work: Path, out: Path) -> float:
    cfg = load_seg_config("11_sensor") or {}
    dur = float(cfg.get("total_dur", 2.0))
    seg_subtitle = cfg.get("subtitle", "ESP32-C6 + BNO085 姿态带 · BLE 接入 Catune")
    arch_png = work / "sensor_arch.png"
    render_sensor_arch_slide(arch_png)
    img_clip(SRC / "ESP32-C6主板+BNO085传感器.JPG", work / "L_raw.mp4", dur, full_width=False, work=work)
    img_clip(arch_png, work / "R_raw.mp4", dur, full_width=False, work=work)
    half_clip(work / "L_raw.mp4", work / "L_half.mp4", cfg.get("left_label", "硬件实物 · ESP32+BNO085"), dur=dur, work=work)
    half_clip(work / "R_raw.mp4", work / "R_half.mp4", cfg.get("right_label", "系统架构"), dur=dur, align="right", work=work)
    return hstack_clips(
        work / "L_half.mp4", work / "R_half.mp4", out,
        seg_subtitle, work=work,
    )


def build_12_lora(work: Path, out: Path) -> float:
    lora = _load_lora_module()
    lora_dir = work / "lora"
    lora_dir.mkdir(exist_ok=True)
    lora.render_logits_slide(lora_dir / "logits_slide.png", delta=14.4445)
    # 预渲染 compare 兜底（用 markdown 渲 PNG）
    compare_fallback_png = lora_dir / "compare_slide.png"
    if not compare_fallback_png.is_file():
        lora.render_compare_slide(ROOT / "training" / "compare.md", compare_fallback_png)

    cfg = load_seg_config("12_lora") or {}
    slides_cfg = cfg.get("slides", [])
    if not slides_cfg:
        # 兜底：与旧硬编码对齐
        slides_cfg = [
            {"name": "loss", "file": str(ROOT / "training" / "loss_curve.png"), "dur": 2.5,
             "subtitle": "LoRA 训练收敛 · eval loss 0.27 降至 0.11"},
            {"name": "compare", "file": str(SRC / "compare-lora.png"), "fallback": "training/compare.md", "dur": 6.0,
             "subtitle": "7 条测试 0/7 与基座一致 · 学到猫教练话术"},
            {"name": "logits", "file": str(lora_dir / "logits_slide.png"), "dur": 2.5,
             "subtitle": "logits delta max 14.44 · LoRA 确已改写权重"},
        ]

    def _resolve(p: str) -> Path:
        pp = Path(p)
        return pp if pp.is_absolute() else ROOT / p

    parts: list[Path] = []
    total = 0.0
    for slide in slides_cfg:
        stem = slide.get("name", f"slide_{len(parts)}")
        # 动态类型：logits_slide 用 lora_dir 下已渲染的图
        if slide.get("type") == "logits_slide":
            img = lora_dir / "logits_slide.png"
        else:
            img = _resolve(slide["file"])
            if not img.is_file() and slide.get("fallback"):
                # 兜底：compare 走 markdown 渲染的 PNG
                img = compare_fallback_png
        dur = float(slide.get("dur", 2.5))
        sub = slide.get("subtitle", "")
        p = work / f"{stem}.mp4"
        img_clip(img, p, dur, subtitle=sub, work=work)
        parts.append(p)
        total += dur
    concat_videos(parts, out)
    return total


def build_13_close(work: Path, out: Path) -> float:
    return build_brand_from_config("13_close", work, out, {
        "card_title": "CATUNE",
        "card_subtitle": "久坐办公人群的端侧姿态管理 APP",
        "dur": 3.0,
    })


BUILDERS: dict[str, Callable[[Path, Path], float]] = {
    "00_open": build_00_open,
    "01_launch": build_01_launch,
    "02_model": build_02_model,
    "03_cat1": build_03_cat1,
    "04_cat2": build_04_cat2,
    "05_ai": build_05_ai,
    "06_train": build_06_train,
    "07_plant": build_07_plant,
    "08_evidence": build_08_evidence,
    "09_bench": build_09_bench,
    "10_sme2": build_10_sme2,
    "11_sensor": build_11_sensor,
    "12_lora": build_12_lora,
    "13_close": build_13_close,
}

SEGMENT_TITLES = {
    "00_open": "定版片头 CATUNE",
    "01_launch": "启动",
    "02_model": "下载模型",
    "03_cat1": "第一次猫动 (左佩戴 / 右 iOS) [可配置]",
    "04_cat2": "第二次猫动 (左监控 / 右端侧 LLM)",
    "05_ai": "AI 姿态评估",
    "06_train": "跟练",
    "07_plant": "Plant + 日报周报",
    "08_evidence": "证明材料分段卡",
    "09_bench": "基准测试截图",
    "10_sme2": "SME2",
    "11_sensor": "传感器硬件",
    "12_lora": "LoRA 微调",
    "13_close": "定版片尾 CATUNE",
}


def build_one(seg_id: str) -> tuple[Path, float]:
    if seg_id not in BUILDERS:
        raise SystemExit(f"未知段落: {seg_id}，可用 list 查看")
    work = seg_work(seg_id)
    out = segment_output(seg_id)
    print(f"==> 生成 {seg_id} · {SEGMENT_TITLES.get(seg_id, '')}")
    dur = BUILDERS[seg_id](work, out)
    actual = probe_dur(out) or dur
    write_segment_meta(seg_id, out, actual)
    print(f"    输出: {out.relative_to(ROOT)}  ({actual:.2f}s)")
    cfg_path = CONFIG_DIR / f"{seg_id}.json"
    if cfg_path.is_file():
        print(f"    配置: {cfg_path.relative_to(ROOT)}")
    return out, actual


def merge_segments() -> None:
    missing = [s for s in SEGMENT_ORDER if not segment_output(s).is_file()]
    if missing:
        raise SystemExit(f"缺少段落文件，请先 build: {', '.join(missing)}")
    segments: list[tuple[Path, float]] = []
    for seg_id in SEGMENT_ORDER:
        p = segment_output(seg_id)
        segments.append((p, probe_dur(p)))
    print(f"==> 合并 {len(segments)} 段，过渡 {XFADE}s …")
    xfade_join(segments, OUT)
    total = sum(d for _, d in segments) - XFADE * (len(segments) - 1)
    print(f"\n完成: {OUT}")
    print(f"   1920x1080 · 约 {total:.0f}s")


def xfade_join(segments: list[tuple[Path, float]], out: Path) -> None:
    if len(segments) == 1:
        run(["ffmpeg", "-y", "-hide_banner", "-i", str(segments[0][0]), "-c", "copy", str(out)], quiet=False)
        return
    inputs: list[str] = []
    for p, _ in segments:
        inputs += ["-i", str(p)]
    parts: list[str] = []
    offset = segments[0][1] - XFADE
    prev = "[0:v]"
    for i in range(1, len(segments)):
        nxt = f"[{i}:v]"
        out_label = f"[v{i}]" if i < len(segments) - 1 else "[v]"
        parts.append(f"{prev}{nxt}xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{out_label}")
        prev = out_label
        offset += segments[i][1] - XFADE
    run([
        "ffmpeg", "-y", "-hide_banner", *inputs,
        "-filter_complex", ";".join(parts), "-map", "[v]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out),
    ], quiet=False)


def cmd_list() -> None:
    print("段落清单 (按成片顺序):\n")
    for seg_id in SEGMENT_ORDER:
        out = segment_output(seg_id)
        status = "已有" if out.is_file() else "未生成"
        cfg = CONFIG_DIR / f"{seg_id}.json"
        cfg_hint = f"  配置: {cfg.relative_to(ROOT)}" if cfg.is_file() else ""
        print(f"  {seg_id}  {SEGMENT_TITLES.get(seg_id, '')}  [{status}]{cfg_hint}")
    print("\n常用:")
    print("  python3 scripts/compose-competition-video.py build 03_cat1")
    print("  python3 scripts/compose-competition-video.py merge")


def main() -> None:
    if not which("ffmpeg"):
        sys.exit("需要 ffmpeg")
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)

    parser = argparse.ArgumentParser(description="Catune 参赛片分段合成")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="列出段落")

    p_build = sub.add_parser("build", help="生成单段或全部")
    p_build.add_argument("segment_id", nargs="?", help="段落 id，如 03_cat1")
    p_build.add_argument("--all", action="store_true", help="生成全部段落")

    sub.add_parser("merge", help="合并 mp4/segments/ 下各段")
    sub.add_parser("all", help="build --all + merge")

    args = parser.parse_args()

    if args.cmd == "list":
        cmd_list()
        return

    if args.cmd == "build":
        if args.all:
            for seg_id in SEGMENT_ORDER:
                build_one(seg_id)
        elif args.segment_id:
            build_one(args.segment_id)
        else:
            parser.error("请指定 segment_id 或 --all")
        return

    if args.cmd == "merge":
        merge_segments()
        return

    if args.cmd == "all":
        for seg_id in SEGMENT_ORDER:
            build_one(seg_id)
        merge_segments()
        return


if __name__ == "__main__":
    main()
