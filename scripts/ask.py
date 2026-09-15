#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
问道（命令行版）
================

与 public/ask.js 同源同逻辑的三层检索，用于批量自测与回归。
浏览器端不调 LLM，此处也不调——纯本地语料检索。

三层：
    ① 语义桥 —— 现代问法 → 古典义理 → 指向章节
    ② 语料直检 —— 问句里直引原文，走 goldwords._match_chapters
    ③ 主题降级 —— 前两层不中，按字面/主题泛荐，如实告知

用法：
    python3 scripts/ask.py "我最近很焦虑，静不下来"
    python3 scripts/ask.py --test          # 跑 20 例回归
    python3 scripts/ask.py --index         # 看丹字索引
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from goldwords import CORPUS, _match_chapters  # noqa: E402

INDEX_JSON = ROOT / "public" / "data" / "index.json"

# --------------------------------------------------------------------------
# 语义桥（与 public/ask.js 的 BRIDGE 逐条对应）
# --------------------------------------------------------------------------
BRIDGE = [
    {
        "key": "虚静", "yili": "虚静守笃",
        "say": "心不静，不是你不够努力，是里面太满。",
        "trig": ["焦虑", "烦", "烦躁", "心烦", "静不下", "静不下来", "心乱", "不安", "躁", "坐不住",
                 "睡不着", "内耗", "胡思乱想", "定不下", "太吵", "杂念", "走神", "心浮", "急"],
        "yiliWords": ["静", "虚", "守", "笃", "归根", "清静"],
        "ids": [16, 45, 5, 26, 15],
        "themes": ["宇宙论", "修身"],
    },
    {
        "key": "柔弱", "yili": "柔弱处上",
        "say": "硬撑才累。柔软的东西活得久。",
        "trig": ["太累", "好累", "撑不住", "想放弃", "扛不住", "疲惫", "累垮", "顶不住", "坚持不",
                 "熬不住", "极限", "透支", "硬撑", "卷不动"],
        "yiliWords": ["柔", "弱", "水", "处下", "不争"],
        "ids": [76, 8, 43, 78, 52],
        "themes": ["处世", "辩证"],
    },
    {
        "key": "不争", "yili": "不争之德",
        "say": "争，是因为还没站到那个位置。",
        "trig": ["争不过", "抢功", "被抢", "抢了", "被抢了", "功劳", "白干", "背锅",
                 "不公平", "憋屈", "委屈", "被人算计", "看不惯", "较劲",
                 "争不来", "斗不过", "被排挤", "吃亏"],
        "yiliWords": ["不争", "善下", "曲", "全", "让"],
        "ids": [8, 22, 66, 68, 81],
        "themes": ["处世", "治国"],
    },
    {
        "key": "知足", "yili": "知足知止",
        "say": "不够的从来不是拥有的，是「还想要」。",
        "trig": ["不知足", "想要更多", "不满足", "贪", "不够", "眼红", "羡慕", "攀比", "欲望",
                 "停不下来", "还想要", "总嫌少", "永远不够"],
        "yiliWords": ["知足", "知止", "足", "止", "俭", "啬"],
        "ids": [44, 46, 33, 9, 32],
        "themes": ["通论", "修身"],
    },
    {
        "key": "无为", "yili": "无为顺时",
        "say": "不知道该怎么动的时候，不动往往也是动。",
        "trig": ["迷茫", "不知道", "怎么办", "该不该", "纠结", "选哪", "没方向", "卡住", "无力",
                 "顺其自然", "随缘", "放手", "算了"],
        "yiliWords": ["无为", "自然", "顺", "时", "因", "势"],
        "ids": [37, 48, 64, 23, 17],
        "themes": ["无为", "宇宙论"],
    },
    {
        "key": "豫慎", "yili": "慎终如始",
        "say": "多数翻车，发生在「快成了」的前夜。",
        "trig": ["急躁", "急", "想快", "来不及", "赶进度", "粗心", "马虎", "出错", "翻车", "功亏",
                 "差一点", "快成了", "松懈", "浮躁"],
        "yiliWords": ["慎", "细", "豫", "始", "几", "微"],
        "ids": [64, 63, 15, 24, 41],
        "themes": ["宇宙论", "治国"],
    },
    {
        "key": "养生", "yili": "含德之厚",
        "say": "养生的关键不在加，在少耗。",
        "trig": ["身体", "健康", "养生", "失眠", "生病", "疲惫", "气血", "虚了", "调理", "亚健康",
                 "熬夜", "元气", "精力", "恢复", "病"],
        "yiliWords": ["和", "气", "生", "养", "啬", "柔"],
        "ids": [55, 8, 42, 59, 50],
        "themes": ["修身", "宇宙论"],
    },
    {
        "key": "观妙", "yili": "观妙观徼",
        "say": "看得见的，从来不是全部。",
        "trig": ["本质", "真相", "看清", "看透", "规律", "为什么", "底层", "核心", "根本", "实在",
                 "道理", "究竟", "什么叫", "是什么"],
        "yiliWords": ["观", "妙", "徼", "玄", "明", "反"],
        "ids": [1, 16, 21, 14, 40],
        "themes": ["宇宙论"],
    },
    {
        "key": "处下", "yili": "善下为谷",
        "say": "想让人跟着你，先站到比他们低的地方。",
        "trig": ["领导", "管理", "带团队", "下属", "同事", "相处", "人际关系", "管人", "威信",
                 "服人", "上位", "老板", "团队", "合作"],
        "yiliWords": ["下", "善下", "江", "谷", "后", "不争"],
        "ids": [66, 17, 8, 61, 68],
        "themes": ["治国", "处世"],
    },
    {
        "key": "祸福", "yili": "祸福相倚",
        "say": "眼前的好事坏事，都还没到下结论的时候。",
        "trig": ["得失", "成败", "倒霉", "好运", "失败", "挫折", "不顺", "失去", "错过了", "后悔",
                 "运气", "起伏", "反转", "亏了"],
        "yiliWords": ["祸", "福", "反", "复", "倚", "伏", "成败", "得失"],
        "ids": [58, 2, 40, 64, 22],
        "themes": ["辩证", "宇宙论"],
    },
    {
        "key": "损益", "yili": "损之又损",
        "say": "加法做到头，就该做减法了。",
        "trig": ["放不下", "执念", "极致", "完美", "越多越好", "堆砌", "复杂", "负担", "舍不得",
                 "断舍离", "精简", "减法", "包袱"],
        "yiliWords": ["损", "益", "盈", "虚", "朴", "素"],
        "ids": [48, 9, 15, 19, 11],
        "themes": ["宇宙论", "辩证"],
    },
    {
        "key": "天道", "yili": "天道循环",
        "say": "万物有自己的节律，人不是例外。",
        "trig": ["自然", "天地", "宇宙", "规律", "循环", "周期", "四季", "天人", "万物", "天道",
                 "法则", "运行", "变化"],
        "yiliWords": ["自然", "天", "道", "循环", "周行", "反"],
        "ids": [25, 40, 77, 42, 51],
        "themes": ["宇宙论"],
    },
    {
        "key": "自知", "yili": "自知者明",
        "say": "看清自己，比看清别人有用得多。",
        "trig": ["认识自己", "了解自己", "自我", "看不清自己", "自省", "反省", "我是谁", "定位",
                 "价值", "意义", "自卑", "自信"],
        "yiliWords": ["自知", "明", "己", "身", "自", "知人"],
        "ids": [33, 72, 13, 71, 10],
        "themes": ["修身"],
    },
    {
        "key": "用兵", "yili": "不得已而用之",
        "say": "能不用的力量，才是真正的力量。",
        "trig": ["冲突", "对抗", "竞争", "打仗", "撕破脸", "敌人", "开战", "反击", "攻击", "博弈",
                 "斗争", "硬碰硬"],
        "yiliWords": ["兵", "战", "争", "哀", "慈"],
        "ids": [31, 69, 30, 36, 67],
        "themes": ["治国"],
    },
    {
        "key": "幼柔", "yili": "复归于婴儿",
        "say": "回到最初那种柔软，不是退化，是回到源头。",
        "trig": ["初心", "孩子", "童年", "单纯", "纯粹", "回到", "本真", "赤子", "变复杂了"],
        "yiliWords": ["婴儿", "赤子", "朴", "素", "复归"],
        "ids": [28, 55, 10, 20, 19],
        "themes": ["修身", "宇宙论"],
    },
    {
        "key": "知止", "yili": "知止不殆",
        "say": "知道在哪停，比知道往哪冲更值钱。",
        "trig": ["停下来", "该不该继续", "放弃", "收手", "见好就收", "到底了", "退"],
        "yiliWords": ["止", "退", "已", "身退", "不殆"],
        "ids": [9, 32, 44, 46, 77],
        "themes": ["通论"],
    },
]

W = {
    "trig": 10, "yili_top": 8, "kw": 2,
    "theme": 3, "order": 6, "order_step": 1.2, "refined": 1.5,
}

PUNCT = "，。；：、！？（）「」『』《》〈〉·…—　 \n\t"


def clean_q(q):
    return "".join(c for c in str(q) if c not in PUNCT).lower()


# --------------------------------------------------------------------------
def load():
    return json.loads(INDEX_JSON.read_text(encoding="utf-8"))


def chap_of(data, cid):
    return next((c for c in data["chapters"] if c["id"] == cid), None)


def is_deep(data, cid):
    return str(cid) in (data.get("detail") or {})


def bridges_of(q):
    out = []
    for b in BRIDGE:
        tg = [t for t in b["trig"] if t in q]
        if tg:
            out.append((b, tg))
    return out


# --------------------------------------------------------------------------
def query(text, data, limit=4):
    raw = (text or "").strip()
    q = clean_q(raw)
    if not raw:
        return {"mode": "empty", "hits": [], "bridges": [], "note": "尚未提问。"}

    mh = _match_chapters(raw)
    br = bridges_of(q)
    if mh:
        return _quote(raw, mh, data, limit, br)
    if br:
        return _bridge(raw, q, br, data, limit)
    return _theme(raw, q, data, limit)


def _make(data, cid, extra):
    c = chap_of(data, cid)
    if not c:
        return None
    d = (data.get("detail") or {}).get(str(cid))
    h = {
        "id": cid, "title": c["title"], "original": c["original"],
        "danzi": c.get("danzi") or (d or {}).get("danzi", ""),
        "danjue": c.get("danjue") or (d or {}).get("danjue", ""),
        "themes": c.get("themes", []), "deep": bool(d), "detail": d,
    }
    h.update(extra)
    return h


def _quote(raw, mh, data, limit, br):
    best = {}
    for cid, n, frag in mh:
        if cid not in best or n > best[cid][0]:
            best[cid] = (n, frag)
    ids = sorted(best, key=lambda i: (-best[i][0], i))[:limit]
    hits = []
    for i, cid in enumerate(ids):
        n, frag = best[cid]
        why = "你在问句里点明了此章" if n >= 99 else f"问句里引到了此章原文（「{frag}」）"
        h = _make(data, cid, {"score": 100 - i * 5, "why": why, "via": "直引原文"})
        if h:
            hits.append(h)
    note = ("问句里引到了原章句，此章正应你。" if len(hits) == 1
            else "问句里引到了原章句，以下数章正应你。")
    return {"mode": "quote", "hits": hits, "bridges": br, "note": note, "raw": raw}


def _bridge(raw, q, br, data, limit):
    score = {}
    for b, tg in br:
        for idx, cid in enumerate(b["ids"]):
            s = score.setdefault(cid, {"score": 0.0, "why": [], "via": []})
            s["score"] += W["order"] - idx * W["order_step"]
            s["why"].append(b["yili"])
            s["via"].append(b["key"])
            ct = (chap_of(data, cid) or {}).get("themes", [])
            if any(t in ct for t in b["themes"]):
                s["score"] += W["theme"]

        first = b["ids"][0]
        s = score.setdefault(first, {"score": 0.0, "why": [], "via": []})
        s["score"] += W["trig"] * min(len(tg), 2)
        s["trig"] = tg
        s["bridgeYili"] = b["yili"]
        s["bridgeSay"] = b["say"]

        yh = [w for w in b["yiliWords"] if w in q]
        if yh:
            s["score"] += W["yili_top"] * min(len(yh), 2)
            s["yiliHit"] = yh

    if len(q) >= 2:
        for cid, s in score.items():
            kws = (chap_of(data, cid) or {}).get("keywords", [])
            n = sum(1 for k in kws if k and k in q)
            s["score"] += min(n, 4) * W["kw"]

    for cid, s in score.items():
        if is_deep(data, cid):
            s["score"] *= W["refined"]

    ranked = sorted(score.items(), key=lambda kv: (-kv[1]["score"], kv[0]))[:limit]
    hits = []
    for cid, s in ranked:
        b0 = next((b for b, _ in br if cid in b["ids"]), None)
        if s.get("trig") and s.get("bridgeYili"):
            why = f"你问「{'、'.join(s['trig'][:3])}」，此章讲的是 {s['bridgeYili']}——{b0['say'] if b0 else ''}"
        else:
            why = f"此章与「{s['why'][0] if s['why'] else ''}」之义相扣"
        h = _make(data, cid, {"score": round(s["score"], 1), "why": why, "via": " · ".join(s["via"])})
        if h:
            hits.append(h)

    prime = br[0][0]
    note = (f"此问落于「{prime['yili']}」一义，炉中恰有此丹。" if len(hits) == 1
            else f"此问落于「{prime['yili']}」一义，取丹 {len(hits)} 枚，自近及远。")
    return {"mode": "bridge", "hits": hits, "bridges": br, "note": note, "raw": raw}


def _theme(raw, q, data, limit):
    T = {k for c in data["chapters"] for k in (c.get("keywords") or [])}
    qs = [c for c in dict.fromkeys(q) if c in T]
    score = {}
    if qs:
        for c in data["chapters"]:
            n = sum(1 for k in (c.get("keywords") or []) if k in qs)
            if n:
                score[c["id"]] = {
                    "score": n * W["kw"] * 2,
                    "why": f"题面之字「{'、'.join(qs[:4])}」与此章相应",
                    "via": "字检",
                }
    if not score:
        for c in data["chapters"]:
            score[c["id"]] = {"score": 0.0, "why": "未在题面找到直接对应，此章或可相参", "via": "泛览"}

    for cid, s in score.items():
        if is_deep(data, cid):
            s["score"] *= W["refined"]
        s["score"] += max(0, 88 - cid) * 0.02

    ranked = sorted(score.items(), key=lambda kv: (-kv[1]["score"], kv[0]))[:limit]
    hits = [_make(data, cid, {"score": round(s["score"], 1), "why": s["why"], "via": s["via"]})
            for cid, s in ranked]
    hits = [h for h in hits if h]
    note = ("未落于某一路义理，只在字面上有此相应，权作参证。" if qs
            else "此问未在炉中找到直接对应。如实相告——以下数章姑且相参，或可自其中另生一问。")
    return {"mode": "theme", "hits": hits, "bridges": [], "note": note, "raw": raw}


# --------------------------------------------------------------------------
def show(r):
    tag = {"bridge": "语义桥", "quote": "语料直检", "theme": "主题降级",
           "empty": "空问"}.get(r["mode"], r["mode"])
    print(f"\n问：{r['raw']}")
    print(f"径：{tag}　｜　{re.sub('<[^>]+>', '', r['note'])}")
    if r["bridges"]:
        parts = [f"{b['yili']}（触发：{'、'.join(tg[:2])}）" for b, tg in r["bridges"][:3]]
        print("应：" + "　".join(parts))
    for h in r["hits"]:
        deep = "金丹已成" if h["deep"] else "金丹未炼"
        print(f"  第 {h['id']:>2} 章 · {h['title']}　丹字「{h['danzi']}」　〔{deep}〕")
        print(f"      丹诀　{h['danjue']}")
        print(f"      何以应你　{h['why']}")


# 20 例回归：问题 → 期望命中的章（任一命中即算过）
CASES = [
    ("我最近很焦虑，静不下来", [16, 45, 5, 26]),
    ("天天加班，太累了，撑不住", [76, 8, 43, 78]),
    ("干得多，功劳被别人抢了", [8, 22, 66, 68]),
    ("工资涨了还是觉得不够，想要更多", [44, 46, 33, 9]),
    ("不知道该不该辞职，很迷茫", [37, 48, 64, 23]),
    ("做事总是很急，想快点出结果", [64, 63, 15, 24]),
    ("身体不太好，想调理一下", [55, 8, 42, 59]),
    ("怎么才能看清一件事的本质", [1, 16, 21, 14]),
    ("怎么带团队，让下属服我", [66, 17, 8, 61]),
    ("项目失败了，很挫折", [58, 2, 40, 64]),
    ("东西太多了，放不下，想精简", [48, 9, 15, 19]),
    ("天地运行的规律是什么", [25, 40, 77, 42]),
    ("总觉得自己不够好，怎么看自己", [33, 72, 13, 71]),
    ("跟人硬碰硬吃亏了", [31, 69, 30, 36]),
    ("想回到小时候那种单纯", [28, 55, 10, 20]),
    ("上善若水是什么意思", [8]),
    ("第 11 章 有之以为利，无之以为用怎么理解", [11]),
    ("祸兮福之所倚，福兮祸之所伏", [58]),
    ("今天中午吃什么好呢", None),          # 无解，应降级
    ("qqq zzz 1234", None),                # 无解，应降级
]


def run_tests():
    data = load()
    ok = 0
    for q, expect in CASES:
        r = query(q, data)
        got = [h["id"] for h in r["hits"]]
        if expect is None:
            good = r["mode"] == "theme"
            mark = "✓" if good else "✗"
            print(f"{mark} [{r['mode']:>6}] {q}　→ {got}（应降级）")
        else:
            good = any(i in got for i in expect)
            mark = "✓" if good else "✗"
            print(f"{mark} [{r['mode']:>6}] {q}　→ {got}　期望含 {expect}")
        ok += good
    print(f"\n{'='*58}\n命中 {ok} / {len(CASES)}")
    return ok == len(CASES)


def show_index(data):
    m = {}
    for c in data["chapters"]:
        z = c.get("danzi")
        if z:
            m.setdefault(z, []).append(c["id"])
    deep = {z: any(is_deep(data, i) for i in ids) for z, ids in m.items()}
    print(f"丹字共 {len(m)} 个（81 章）")
    for z, ids in sorted(m.items(), key=lambda kv: (not deep[kv[0]], -len(kv[1]), kv[0])):
        star = "★" if deep[z] else " "
        print(f"  {star} {z}　第 {'、'.join(map(str, ids))} 章")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("q", nargs="*", help="所问之句")
    ap.add_argument("--test", action="store_true", help="跑回归用例")
    ap.add_argument("--index", action="store_true", help="看丹字索引")
    ap.add_argument("--limit", type=int, default=4)
    a = ap.parse_args()

    D = load()
    if a.test:
        sys.exit(0 if run_tests() else 1)
    if a.index:
        show_index(D)
        sys.exit(0)
    if not a.q:
        ap.print_help()
        sys.exit(0)
    show(query(" ".join(a.q), D, a.limit))
