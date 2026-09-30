#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
distill.py —— S→M 蒸馏：把经验流水（Journal.md）提炼成内核候选原则

用法:
    python3 scripts/distill.py                  # 生成 CANDIDATES.md
    python3 scripts/distill.py --min 3          # 只提出现 >=3 次的
    python3 scripts/distill.py --stdout         # 直接打到屏幕
    python3 scripts/distill.py --apply          # 把 CANDIDATES.md 里勾选的落进 Memory.md

设计原则:
    Journal --distill--> CANDIDATES --人勾选--> Memory
    脚本**绝不自动改内核**。M 为君，君的改动由人定夺。
"""

import argparse
import datetime
import os
import re
import sys

# 值得进 M 的信号词（反直觉 / 付出代价 / 可复用）
SIGNAL = ["踩坑", "返工", "纠正", "教训", "下次", "以后", "注意", "不要", "别再",
          "总是", "又", "重复", "再犯", "应该", "必须", "问题", "失败", "错过",
          "误以为", "其实", "才发现"]
# 一次性事实的信号词（不该进 M）
NOISE = ["本次", "这次临时", "当前版本", "目前用的是"]


def read(p):
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None


def say(t, m):
    print(f"  [{t}] {m}", file=sys.stderr)


def grams(s, n=2):
    """字符 n-gram —— 没分词库时也能算中文相似度"""
    s = re.sub(r"[\s，。、；：！？（）「」【】,.!?()\-—]+", "", s or "")
    if len(s) < n:
        return {s} if s else set()
    return {s[i:i + n] for i in range(len(s) - n + 1)}


def sim(a, b):
    A, B = grams(a), grams(b)
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def parse_entries(text):
    """解析 Journal.md 的条目"""
    if not text:
        return []
    parts = re.split(r"^## ", text, flags=re.M)[1:]
    out = []
    for p in parts:
        head, _, body = p.partition("\n")
        m = re.match(r"(\d{4}-\d{2}-\d{2})\s*#(\d+)\s*(.+)", head.strip())
        if not m:
            continue
        date, no, title = m.group(1), int(m.group(2)), m.group(3).strip()
        if "已蒸馏" in title:
            title = title.replace("已蒸馏", "").strip(" []")
        if re.search(r"状态\s*[:：]\s*已蒸馏", body):
            continue  # 已提炼过的跳过
        learn = ""
        kind = ""
        topic = ""
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("- 学到了什么"):
                learn = line.split("：", 1)[-1].split(":", 1)[-1].strip()
            elif line.startswith("- 归类"):
                kind = line.split("：", 1)[-1].split(":", 1)[-1].strip().upper()
            elif line.startswith("- 主题"):
                topic = line.split("：", 1)[-1].split(":", 1)[-1].strip()
        out.append({"date": date, "no": no, "title": title, "learn": learn or title,
                    "kind": kind, "topic": topic, "body": body})
    return out


def cluster(entries, threshold=0.22):
    """聚类：先按「主题」硬性归并，再按相似度兜底。

    为什么需要主题字段：语义相近但用词不同的两条（如「凭证进对话」与
    「凭证要轮换」），纯字符相似度抓不住。让人给语义标签、机器只做机械
    匹配 —— 人做判断，机器做执行。
    """
    clusters = []
    by_topic = {}
    for e in entries:
        if e["topic"]:
            by_topic.setdefault(e["topic"], []).append(e)
    for t, items in by_topic.items():
        clusters.append({"rep": items[0], "items": list(items), "topic": t})

    def best_match(e):
        """标题与正文取最大相似度 —— 标题往往更能代表主题"""
        best, bs = None, 0.0
        for c in clusters:
            s = max(sim(e["title"], c["rep"]["title"]), sim(e["learn"], c["rep"]["learn"]))
            if s > bs:
                best, bs = c, s
        return best, bs

    for e in entries:
        if e["topic"]:
            continue
        c, s = best_match(e)
        if c is not None and s >= threshold:
            c["items"].append(e)
        else:
            clusters.append({"rep": e, "items": [e], "topic": ""})
    return clusters


def score(c):
    """打分：归类初判 + 信号词 + 频次"""
    blob = " ".join(i["learn"] + " " + i["title"] for i in c["items"])
    s = 0
    if c["rep"]["kind"].startswith("M"):
        s += 3
    hits = sum(1 for w in SIGNAL if w in blob)
    s += min(hits, 3)
    n = len(c["items"])
    if n >= 3:
        s += 3
    elif n >= 2:
        s += 2
    if any(w in blob for w in NOISE):
        s -= 2
    if not c["rep"]["kind"].startswith("M") and not hits:
        s -= 1
    return s


def suggest(c):
    """建议去向"""
    if c["rep"]["kind"].startswith("E1"):
        return "E1（外延·工具）"
    return "S（留在状态）" if score(c) < 3 else "M（内核·原则）"


def render(clusters, root, min_hits):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    scored = sorted(clusters, key=lambda c: -score(c))
    strong = [c for c in scored if len(c["items"]) >= 2 and suggest(c).startswith("M")]
    normal = [c for c in scored if len(c["items"]) < 2 and suggest(c).startswith("M")]
    weak = [c for c in scored if not suggest(c).startswith("M")]

    L = []
    A = L.append
    A("# CANDIDATES —— 蒸馏候选（待人工拍板）\n")
    A(f"> **生成时间**：{now}  ")
    A(f"> **来源**：`Journal.md`（{sum(len(c['items']) for c in clusters)} 条）  ")
    A(f"> **判据**：可复用 ＋ 反直觉 ＋ 付出代价 ＋ 不随环境变\n")
    A("> ⚠️ **脚本绝不自动改内核。** 勾选 `[x]` 后运行 `python3 scripts/distill.py --apply` 才落核。\n")
    A("> **速判**：换一个全新项目，这条还成立吗？成立才勾。\n")
    A("---\n")

    def block(title, desc, cs):
        A(f"## {title}\n")
        if desc:
            A(f"{desc}\n")
        if not cs:
            A("（无）\n")
            return
        for c in sorted(cs, key=lambda x: -score(x)):
            n = len(c["items"])
            tag = f"`出现 {n} 次`" if n > 1 else "`单次`"
            tgt = suggest(c)
            A(f"- [ ] **{c['rep']['title']}**　{tag}　`建议：{tgt}`")
            A(f"  - 学到了什么：{c['rep']['learn']}")
            ev = "、".join(f"#{i['no']}（{i['date']}）" for i in c["items"])
            A(f"  - 证据：{ev}\n")

    block("强候选（重复出现 ≥2 次）",
          "> **一次是意外，两次是模式，三次是原则。** 这些最该落核。", strong)
    block("一般候选", None, normal)
    block("不建议入核（留 S 或挂 E1）",
          "> 一次性事实留 `State.md`；工具用法挂 `TOOLS.md`。", weak)

    A("---\n")
    A("**勾选后**：`python3 scripts/distill.py --apply`\n")
    return "\n".join(L)


def apply_candidates(root):
    """把勾选项落入 Memory.md，并回写 Journal 标记"""
    cand = read(os.path.join(root, "CANDIDATES.md"))
    if not cand:
        print("✗ 没有 CANDIDATES.md，先跑一次 distill.py", file=sys.stderr)
        sys.exit(1)
    mem_path = os.path.join(root, "Memory.md")
    mem = read(mem_path)
    if mem is None:
        print("✗ 没有 Memory.md，内核不存在", file=sys.stderr)
        sys.exit(1)

    picked = [l.strip()[6:].strip() for l in cand.splitlines() if l.strip().startswith("- [x]")]
    picked = [re.sub(r"\*\*|\s+`[^`]*`", "", p).strip() for p in picked]
    if not picked:
        print("· 没有勾选项，什么也没做。", file=sys.stderr)
        return

    jpath = os.path.join(root, "Journal.md")
    j = read(jpath)
    now = datetime.datetime.now().strftime("%Y-%m-%d")

    # --- 1. 写入 Memory.md：插在最后一个 ## 标题之前，保证「最终定义」仍压轴 ---
    lines = [f"- **{t}**（{now} 蒸馏落核）" for t in picked]
    heads = list(re.finditer(r"^## .*$", mem, flags=re.M))
    exist = re.search(r"^## 熏修所得.*$", mem, flags=re.M)
    if exist:
        nxt = re.search(r"^## ", mem[exist.end():], flags=re.M)
        end = exist.end() + (nxt.start() if nxt else len(mem) - exist.end())
        mem = mem[:end].rstrip() + "\n" + "\n".join(lines) + "\n" + mem[end:]
    elif heads:
        pos = heads[-1].start()
        sec = "## 熏修所得（S→M 蒸馏）\n\n" + "\n".join(lines) + "\n\n"
        mem = mem[:pos] + sec + mem[pos:]
    else:
        mem = mem.rstrip() + "\n\n## 熏修所得（S→M 蒸馏）\n\n" + "\n".join(lines) + "\n"

    # --- 2. 回写 Journal：对应条目标记已蒸馏，避免下次重复提炼 ---
    marked = 0
    if j:
        blocks = re.split(r"(^## [^\n]*$)", j, flags=re.M)
        # blocks: ['', head1, body1, head2, body2, ...]
        for i in range(1, len(blocks), 2):
            head = blocks[i]
            if any(t[:10] and t[:10] in head for t in picked):
                body = blocks[i + 1] if i + 1 < len(blocks) else ""
                if "已蒸馏" not in body:
                    blocks[i + 1] = body.rstrip() + f"\n- 状态：已蒸馏（{now}）\n"
                    marked += 1
        j = "".join(blocks)

    with open(mem_path, "w", encoding="utf-8") as f:
        f.write(mem)
    if j:
        with open(jpath, "w", encoding="utf-8") as f:
            f.write(j)

    say("✓", f"已把 {len(picked)} 条写入 Memory.md「熏修所得」")
    say("✓", f"Journal 中 {marked} 条已标记「已蒸馏」，下次不再重复提炼")
    say("!", "请人工复核 Memory.md —— 落核即成硬约束，宁缺毋滥")


def main():
    ap = argparse.ArgumentParser(description="S→M 蒸馏：从 Journal.md 提炼内核候选")
    ap.add_argument("project", nargs="?", default=".", help="项目目录（默认当前）")
    ap.add_argument("--min", type=int, default=1, help="最少出现次数（默认 1）")
    ap.add_argument("--threshold", type=float, default=0.34, help="聚类相似度阈值")
    ap.add_argument("--stdout", action="store_true")
    ap.add_argument("--apply", action="store_true", help="把勾选的候选落进 Memory.md")
    a = ap.parse_args()

    root = os.path.abspath(a.project)
    if a.apply:
        apply_candidates(root)
        return

    j = read(os.path.join(root, "Journal.md"))
    if j is None:
        print(f"✗ 没有 Journal.md —— 先建一个（模板见 template/Journal.md）", file=sys.stderr)
        sys.exit(1)

    entries = parse_entries(j)
    if not entries:
        print("· Journal.md 里还没有条目。", file=sys.stderr)
        sys.exit(0)

    clusters = cluster(entries, a.threshold)
    clusters = [c for c in clusters if len(c["items"]) >= a.min]

    print(f"→ 扫到 {len(entries)} 条流水，聚成 {len(clusters)} 类", file=sys.stderr)
    strong = sum(1 for c in clusters if len(c["items"]) >= 2)
    if strong:
        say("!", f"{strong} 类重复出现 —— 这些是真信号，优先拍板")

    doc = render(clusters, root, a.min)
    if a.stdout:
        sys.stdout.write(doc)
        return
    out = os.path.join(root, "CANDIDATES.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"\n✓ 已生成 {out}", file=sys.stderr)
    print("  勾选 [x] 后：`python3 scripts/distill.py --apply`", file=sys.stderr)


if __name__ == "__main__":
    main()
