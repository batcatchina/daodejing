#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
炼化管道 (Refinement Pipeline)
=============================

把原始素材（文字稿 / 视频转写）炼化成结构化知识，再固化为可复用的"技能"。

流程：
    素材导入 → 章节归位 → 三段式炼化 → 知识入库 → 技能固化

三段式（本系统的核心产物）：
    1. 本意    benyi    —— 字词本义、原文直解、历史语境
    2. 引申义  yinshen  —— 由本意向外推演的义理层
    3. 启迪    qidi     —— 对人生 / 自然 / 宇宙的认识与可践行的智慧

用法：
    python3 scripts/refine.py init                       # 初始化 81 章地基
    python3 scripts/refine.py ingest-text <file>         # 导入文字稿
    python3 scripts/refine.py ingest-video <file>        # 导入视频字幕/转写
    python3 scripts/refine.py refine 1                   # 炼化第 1 章
    python3 scripts/refine.py refine --all --engine llm  # 全量炼化
    python3 scripts/refine.py build                      # 生成索引与技能文件
    python3 scripts/refine.py status                     # 查看炼化进度
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CH_DIR = DATA / "chapters"
RAW_DIR = DATA / "raw"
INDEX = DATA / "index.json"
SKILL = ROOT / "SKILL.md"

sys.path.insert(0, str(ROOT / "scripts"))
from _source_p1 import CHAPTERS_1_40   # noqa: E402
from _source_p2 import CHAPTERS_41_81  # noqa: E402

SOURCE = CHAPTERS_1_40 + CHAPTERS_41_81

# --------------------------------------------------------------------------
# 主题分类：用于横向串联 81 章
# --------------------------------------------------------------------------
THEME_RULES = [
    ("宇宙论", ["道", "天地", "万物", "玄", "母", "根", "始", "无", "有", "混成", "象", "精"]),
    ("处世", ["不争", "谦", "下", "柔", "弱", "后", "让", "江海", "谷", "水"]),
    ("修身", ["自知", "自胜", "知足", "静", "朴", "素", "婴儿", "赤子", "虚", "损"]),
    ("治国", ["民", "国", "天下", "侯王", "圣人", "兵", "治", "政", "税", "法"]),
    ("辩证", ["反", "祸", "福", "盈", "缺", "曲", "全", "刚", "柔", "损", "益", "奇", "正"]),
    ("无为", ["无为", "无事", "好静", "不欲", "自然", "不言", "希言", "因"]),
]


def classify(text: str) -> list:
    """依据关键词给章节打主题标签"""
    hits = []
    for theme, kws in THEME_RULES:
        score = sum(1 for k in kws if k in text)
        if score >= 2:
            hits.append((theme, score))
    hits.sort(key=lambda x: -x[1])
    return [h[0] for h in hits[:3]] or ["通论"]


def keywords_of(text: str, limit: int = 8) -> list:
    """抽取高频实词作为检索关键词（简易版：字频 + 停用词过滤）"""
    stop = set("之乎者也矣焉哉其为其所以是以故夫唯兮曰不无有而则以于者所")
    freq = {}
    for ch in text:
        if ch in stop or not ("一" <= ch <= "鿿"):
            continue
        freq[ch] = freq.get(ch, 0) + 1
    ranked = sorted(freq.items(), key=lambda x: -x[1])
    return [w for w, _ in ranked[:limit]]


# --------------------------------------------------------------------------
# 数据层
# --------------------------------------------------------------------------
def chapter_path(cid: int) -> Path:
    return CH_DIR / f"{cid:03d}.json"


def blank_chapter(cid: int, title: str, original: str) -> dict:
    return {
        "id": cid,
        "title": title,
        "original": original,
        "keywords": keywords_of(original),
        "themes": classify(original),
        "refined": {"benyi": "", "yinshen": "", "qidi": ""},
        "notes": [],          # 从素材中抽取的要点
        "sources": [],        # 素材来源
        "media": [],          # 关联视频 / 音频
        "status": "pending",  # pending | refined
        "refined_at": None,
        "engine": None,
    }


def load_chapter(cid: int) -> dict:
    p = chapter_path(cid)
    if not p.exists():
        raise SystemExit(f"[x] 第 {cid} 章不存在，请先运行 init")
    return json.loads(p.read_text(encoding="utf-8"))


def save_chapter(ch: dict) -> None:
    chapter_path(ch["id"]).write_text(
        json.dumps(ch, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def all_chapters() -> list:
    files = sorted(CH_DIR.glob("*.json"))
    return [json.loads(f.read_text(encoding="utf-8")) for f in files]


def cmd_init(_args) -> None:
    """初始化 81 章地基（仅原文层）"""
    CH_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    created = 0
    for cid, title, original in SOURCE:
        p = chapter_path(cid)
        if p.exists():
            ch = json.loads(p.read_text(encoding="utf-8"))
            ch["original"] = original   # 原文层可被刷新
            ch["title"] = title
        else:
            ch = blank_chapter(cid, title, original)
            created += 1
        save_chapter(ch)
    print(f"[✓] 地基就绪：81 章，新建 {created} 章，其余保留炼化成果")


# --------------------------------------------------------------------------
# 素材导入层
# --------------------------------------------------------------------------
CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def cn2int(s: str) -> int:
    """支持 1-99 的中文数字（道德经只需到 81）"""
    s = s.strip()
    if s.isdigit():
        return int(s)
    if s in CN_NUM:
        return CN_NUM[s]
    if "十" in s:
        a, _, b = s.partition("十")
        tens = CN_NUM.get(a, 1) if a else 1
        ones = CN_NUM.get(b, 0) if b else 0
        return tens * 10 + ones
    return 0


CHAPTER_PAT = re.compile(
    r"(?:第\s*([0-9一二三四五六七八九十]+)\s*章)|"
    r"(?:^|\n)\s*([0-9]{1,2})[\.、．\s]+\S",
    re.M,
)


def split_by_chapter(text: str) -> dict:
    """把长文稿按章切分，返回 {章号: 段落文本}"""
    marks = []
    for m in CHAPTER_PAT.finditer(text):
        raw = m.group(1) or m.group(2)
        cid = cn2int(raw)
        if 1 <= cid <= 81:
            marks.append((m.start(), cid))
    if not marks:
        return {}
    buckets = {}
    for i, (pos, cid) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        buckets.setdefault(cid, "")
        buckets[cid] += text[pos:end].strip() + "\n"
    return buckets


def clean_text(t: str) -> str:
    t = re.sub(r"\r\n?", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    return t.strip()


def strip_srt(t: str) -> str:
    """去掉 srt/vtt 的时间轴与序号，只留文本"""
    t = re.sub(r"^\d{1,4}\s*$", "", t, flags=re.M)
    t = re.sub(r"\d{2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{1,3}.*$", "", t, flags=re.M)
    t = re.sub(r"^WEBVTT.*$", "", t, flags=re.M)
    t = re.sub(r"<[^>]+>", "", t)
    return clean_text(t)


def ingest(kind: str, path: str, force: bool = False) -> None:
    """统一导入入口：文字稿 / 视频转写"""
    src = Path(path)
    if not src.exists():
        raise SystemExit(f"[x] 找不到文件：{path}")

    raw = src.read_text(encoding="utf-8", errors="ignore")
    if src.suffix.lower() in (".srt", ".vtt"):
        raw = strip_srt(raw)
    else:
        raw = clean_text(raw)

    # 归档原始素材
    dest = RAW_DIR / f"{kind}-{int(time.time())}-{src.name}"
    dest.write_text(raw, encoding="utf-8")

    buckets = split_by_chapter(raw)
    if not buckets:
        print(f"[!] 未能自动识别章节号，已归档到 {dest}")
        print("    提示：在文稿里用「第X章」或「1. 」开头，能自动归位")
        return

    touched = []
    for cid, body in buckets.items():
        ch = load_chapter(cid)
        body = body.strip()
        if not body:
            continue
        if force or body not in ch["notes"]:
            ch["notes"].append(body)
        src_tag = f"{kind}:{src.name}"
        if src_tag not in ch["sources"]:
            ch["sources"].append(src_tag)
        if kind == "video":
            ch["media"].append({"file": src.name, "added": time.strftime("%Y-%m-%d")})
        save_chapter(ch)
        touched.append(cid)

    print(f"[✓] 导入完成：{len(touched)} 章归位 -> {sorted(touched)}")
    print(f"    素材归档：{dest}")


# --------------------------------------------------------------------------
# 炼化层
# --------------------------------------------------------------------------
SKILL_PROMPT = """你是《道德经》炼化引擎。给定一章原文，输出严格 JSON，不要任何额外文字。

原文（第{id}章·{title}）：
{original}

{course}

输出格式：
{{
  "benyi": "本意：逐句直解，重点字词训诂，回到先秦语境，说清老子原本在说什么。200-400字。",
  "yinshen": "引申义：由本意向外推演，与前后章节互证，讲清这一章在整个体系中的位置。200-400字。",
  "qidi": "启迪：拆成「人生」「自然」「宇宙」三层，每层给出可践行的具体指引，不要空话。300-500字。"
}}

要求：语言凝练，避免鸡汤，避免空泛赞美。凡有争议处，点明争议而不强作定论。
"""


def build_prompt(ch: dict) -> str:
    course = ""
    if ch.get("notes"):
        course = "课程讲义要点（必须吸收其独到见解）：\n" + "\n".join(
            f"- {n[:600]}" for n in ch["notes"][:3]
        )
    return SKILL_PROMPT.format(
        id=ch["id"], title=ch["title"], original=ch["original"], course=course
    )


def engine_template(ch: dict) -> dict:
    """无 LLM 时的骨架生成：不编造解读，只搭结构 + 标注待补"""
    ori = ch["original"]
    return {
        "benyi": f"【待炼化】原文：{ori[:60]}……\n\n"
                 f"本意层应说明：关键字词训诂、逐句直解、先秦语境还原。",
        "yinshen": "【待炼化】引申义层应说明：与前后章互证、在 81 章体系中的位置。",
        "qidi": "【待炼化】启迪层应分「人生 / 自然 / 宇宙」三层，给出可践行指引。",
    }


def engine_llm(ch: dict) -> dict:
    """调用 OpenAI 兼容接口生成三段式"""
    import urllib.request

    base = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    key = os.environ.get("LLM_API_KEY")
    model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
    if not key:
        raise SystemExit("[x] 缺少 LLM_API_KEY 环境变量")

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": build_prompt(ch)}],
        "temperature": 0.7,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))

    content = data["choices"][0]["message"]["content"]
    m = re.search(r"\{[\s\S]*\}", content)
    if not m:
        raise SystemExit(f"[x] 第 {ch['id']} 章返回非 JSON：{content[:200]}")
    obj = json.loads(m.group(0))
    for k in ("benyi", "yinshen", "qidi"):
        obj.setdefault(k, "")
    return obj


def cmd_refine(args) -> None:
    engine = engine_llm if args.engine == "llm" else engine_template
    targets = range(1, 82) if args.all else [int(x) for x in args.chapters]
    ok = fail = 0
    for cid in targets:
        ch = load_chapter(cid)
        if ch["status"] == "refined" and not args.force:
            print(f"[-] 第 {cid:02d} 章已炼化，跳过（--force 可覆盖）")
            continue
        try:
            result = engine(ch)
            ch["refined"] = result
            ch["status"] = "refined"
            ch["refined_at"] = time.strftime("%Y-%m-%d")
            ch["engine"] = args.engine
            save_chapter(ch)
            ok += 1
            print(f"[✓] 第 {cid:02d} 章炼化完成")
        except Exception as e:  # noqa: BLE001
            fail += 1
            print(f"[x] 第 {cid:02d} 章失败：{e}")
    print(f"\n完成 {ok} 章，失败 {fail} 章")
    if ok:
        cmd_build(args)


# --------------------------------------------------------------------------
# 产出层
# --------------------------------------------------------------------------
def cmd_build(_args) -> None:
    chs = all_chapters()
    if not chs:
        raise SystemExit("[x] 无章节数据，先 init")

    done = [c for c in chs if c["status"] == "refined"]
    index = {
        "total": len(chs),
        "refined": len(done),
        "updated": time.strftime("%Y-%m-%d %H:%M"),
        "chapters": [
            {
                "id": c["id"],
                "title": c["title"],
                "original": c["original"],
                "themes": c["themes"],
                "keywords": c["keywords"],
                "status": c["status"],
                "has_media": bool(c.get("media")),
            }
            for c in chs
        ],
        "detail": {
            str(c["id"]): {
                "benyi": c["refined"]["benyi"],
                "yinshen": c["refined"]["yinshen"],
                "qidi": c["refined"]["qidi"],
                "sources": c.get("sources", []),
            }
            for c in done
        },
    }
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    # 同步一份紧凑版给前端
    pub = ROOT / "public" / "data"
    pub.mkdir(parents=True, exist_ok=True)
    (pub / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    # 固化技能文件
    lines = [
        "# 技能：《道德经》三段式解读",
        "",
        "> 本文件由炼化管道自动生成，勿手工编辑。",
        f"> 生成时间：{index['updated']}｜已炼化 {len(done)}/{len(chs)} 章",
        "",
        "## 使用方法",
        "",
        "当用户提出与《道德经》相关的问题时，按以下三步回应：",
        "",
        "1. **本意** —— 回到原文，说清字词训诂与先秦语境，不附会、不玄化",
        "2. **引申义** —— 由此及彼，与相关章节互证，给出体系化理解",
        "3. **启迪** —— 分「人生 / 自然 / 宇宙」三层，给出可践行的指引",
        "",
        "优先引用下方已炼化章节的内容；未炼化章节须明确标注，不得臆造。",
        "",
        "## 已炼化章节",
        "",
    ]
    for c in done:
        lines += [
            f"### 第{c['id']}章 · {c['title']}",
            "",
            f"> {c['original']}",
            "",
            f"**本意**：{c['refined']['benyi']}",
            "",
            f"**引申义**：{c['refined']['yinshen']}",
            "",
            f"**启迪**：{c['refined']['qidi']}",
            "",
        ]
    SKILL.write_text("\n".join(lines), encoding="utf-8")

    print(f"[✓] 索引：{INDEX}（{len(done)}/{len(chs)} 章已炼化）")
    print(f"[✓] 技能：{SKILL}")


def cmd_status(_args) -> None:
    chs = all_chapters()
    if not chs:
        print("[!] 尚未初始化")
        return
    done = [c["id"] for c in chs if c["status"] == "refined"]
    with_note = [c["id"] for c in chs if c.get("notes")]
    print(f"章节总数：{len(chs)}")
    print(f"已炼化　：{len(done)}")
    print(f"有素材　：{len(with_note)} -> {with_note[:20]}{'...' if len(with_note) > 20 else ''}")
    print(f"待炼化　：{[c['id'] for c in chs if c['status'] != 'refined'][:20]}")


# --------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser(description="《道德经》炼化管道")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init").set_defaults(func=cmd_init)
    sub.add_parser("status").set_defaults(func=cmd_status)
    sub.add_parser("build").set_defaults(func=cmd_build)

    p = sub.add_parser("ingest-text")
    p.add_argument("file")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=lambda a: ingest("text", a.file, a.force))

    p = sub.add_parser("ingest-video")
    p.add_argument("file")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=lambda a: ingest("video", a.file, a.force))

    p = sub.add_parser("refine")
    p.add_argument("chapters", nargs="*")
    p.add_argument("--all", action="store_true")
    p.add_argument("--engine", default="template", choices=["template", "llm"])
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_refine)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
