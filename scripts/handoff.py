#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
handoff.py —— 生成 HANDOFF.md 单文件交接包

用法:
    python3 scripts/handoff.py                    # 当前目录
    python3 scripts/handoff.py ../my-proj         # 指定项目
    python3 scripts/handoff.py . -o /tmp/H.md     # 指定输出
    python3 scripts/handoff.py . --stdout         # 打到标准输出（方便直接粘贴）

它只做一件事: 把「丢了就重建不出来」的那部分挑出来，压成一个可粘贴的文件。
内核原样搬，外延只给索引，真值只给名字。
"""

import argparse
import datetime
import os
import re
import sys

KERNEL = [("Memory.md", "M", "我是谁"), ("Readme.md", "R", "怎么协作"), ("State.md", "S", "现在在哪")]

WARN = []
OK = []


def read(p):
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None


def say(tag, msg):
    print(f"  [{tag}] {msg}", file=sys.stderr)


def section(text, title):
    """抽取 markdown 中某个 ## 标题下的内容。

    注意：标题匹配必须限定在同一行内（用 [^\\n] 而非 .），
    否则正文里出现过该词时会抢先匹配到错的标题，抽到空串。
    """
    if not text:
        return ""
    m = re.search(r"^#{1,3}\s*[^\n]*?" + re.escape(title) + r"[^\n]*$\n(.*?)(?=^#{1,3}\s|\Z)",
                  text, re.M | re.S)
    return m.group(1).strip() if m else ""


def is_empty(body):
    """判断一段内容是否「实质性为空」。

    只写「暂无 / 无 / N/A」等于没写；写了「暂无外部阻塞，但 X 待办」则算有内容。
    """
    if not body:
        return True
    if re.search(r"<!--\s*TODO", body):
        return True
    stripped = re.sub(r"[暂无没有N/A\-—*·。、，\s]+", "", body)
    return len(stripped) < 4


def env_keys(text):
    """从 .env.example 提取键名（只要键，绝不要值）"""
    if not text:
        return []
    keys = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" in s:
            keys.append(s.split("=", 1)[0].strip())
    return keys


# 占位符名字：出现在模板/示例里，不是真凭证
PLACEHOLDER = re.compile(r"(XXX|EXAMPLE|SAMPLE|DEMO|PLACEHOLDER|YOUR|_TEMPLATE|TODO)", re.I)
# 模板与文档目录不算项目的真凭证来源
SKIP_DIRS = (".git", "node_modules", "secrets", ".venv", "template", "docs", "examples", "adapters")


def e3_names(root):
    """全项目扫 E3_* 引用名 —— 只取名字，不取值"""
    names = set()
    pat = re.compile(r"\b(E3_[A-Z0-9_]+)\b")
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith((".md", ".example", ".yml", ".yaml", ".json", ".sh", ".py")):
                continue
            try:
                with open(os.path.join(dirpath, fn), encoding="utf-8", errors="ignore") as f:
                    for m in pat.finditer(f.read()):
                        n = m.group(1)
                        if not PLACEHOLDER.search(n):
                            names.add(n)
            except OSError:
                pass
    return sorted(names)


def strip_code(text):
    """去掉围栏代码块 —— 示例里的 <!-- TODO --> 是文档内容，不是真的待填项"""
    return re.sub(r"```.*?```", "", text or "", flags=re.S)


def leftover_todos(root):
    """扫出还没填的 TODO —— 内核没填完就交接，等于把坑交给别人"""
    hits = []
    for fn in ("Memory.md", "Readme.md", "State.md"):
        t = strip_code(read(os.path.join(root, fn)))
        if not t:
            continue
        n = len(re.findall(r"<!--\s*TODO", t))
        if n:
            hits.append((fn, n))
    return hits


def fence(body, fallback):
    body = (body or "").strip()
    return body if body else fallback


def build(root, author):
    m = read(os.path.join(root, "Memory.md"))
    r = read(os.path.join(root, "Readme.md"))
    s = read(os.path.join(root, "State.md"))

    # --- 内核完整性检查 ---
    missing = [fn for fn, _, _ in KERNEL if read(os.path.join(root, fn)) is None]

    # --- 阻塞检查：State.md 没写阻塞 = 交接无效 ---
    blk = section(s, "阻塞")
    nxt = section(s, "下一步")
    if s is not None:
        if is_empty(blk):
            WARN.append("State.md 的「阻塞」实质为空 —— 这是最不可重建的信息，建议先填")
        else:
            OK.append("State.md 有明确的阻塞记录")
        if is_empty(nxt):
            WARN.append("State.md 的「下一步」实质为空 —— 接手方不知道第一步干什么")
        else:
            OK.append("State.md 有明确的下一步")
        if re.search(r"<!--\s*TODO", strip_code(s)):
            WARN.append("State.md 仍有未填 TODO")

    todos = leftover_todos(root)
    if missing:
        WARN.append("内核缺失：" + "、".join(missing) + " —— 交接包不完整，先补齐内核再交接")
    elif todos:
        WARN.append("内核未填完：" + "、".join(f"{f} 还有 {n} 处 TODO" for f, n in todos))
    else:
        OK.append("内核三件套齐全且无遗留 TODO")

    keys = env_keys(read(os.path.join(root, ".env.example")))
    names = e3_names(root)

    tools = read(os.path.join(root, "TOOLS.md")) or ""
    repos = read(os.path.join(root, "repos.md")) or ""

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    proj = os.path.basename(os.path.abspath(root))

    L = []
    A = L.append
    A(f"# HANDOFF — {proj}\n")
    A(f"> **导出时间**：{now}  ")
    A(f"> **导出者**：{author}  ")
    A(f"> **源**：MRS-EV 内核 v1.1 · 由 `scripts/handoff.py` 生成\n")
    A("---\n")

    # 0 引导
    A("## 0. 引导（接手 Agent 先读这一节，再读别的）\n")
    A("**你是接手方。开工前必须做到：**\n")
    A("1. **按序读第 1 节**，顺序是 M → R → S，不要跳、不要并发读。")
    A("2. **第 1 节的 M 是不可违背的硬约束**，不是建议。与你的判断冲突时，以 M 为准。")
    A("3. **真值一律不在本包内。** 你只会看到 `E3_*` 引用名，值自己去 Vault 取。")
    A("4. **做完第 4 节的接手校验**，答不上就回问，不许猜。\n")
    A("**一句话**：这是别人的项目，你是来接手的，不是来重新定义的。\n")
    A("---\n")

    # 1 内核
    A("## 1. 内核 ●（原样搬运，不得改写）\n")
    for fn, tag, desc in KERNEL:
        body = read(os.path.join(root, fn))
        A(f"### ● {tag} —— {desc}　`{fn}`\n")
        A("```markdown")
        A(fence(body, f"（{fn} 缺失 —— 交接方未填写）"))
        A("```\n")
    A("---\n")

    # 2 外延
    A("## 2. 外延 ○（只需知道存在，不必搬运）\n")
    A("### ○ E1 公开\n")
    A(fence(tools, "（无 TOOLS.md）") + "\n")
    A(fence(repos, "（无 repos.md）") + "\n")
    A("### ○ E2 配置（**只列键名，不给值**）\n")
    if keys:
        A("\n".join(f"- `{k}`" for k in keys) + "\n")
    else:
        A("（`.env.example` 未定义键名）\n")
    A("### ○ E3 凭证（**只列引用名，真值在 Vault**）\n")
    if names:
        A("| 引用名 | 说明 |")
        A("|---|---|")
        for n in names:
            A(f"| `{n}` | 见源项目 Readme.md 凭证引用表 |")
        A("")
    else:
        A("（未发现 `E3_*` 引用名）\n")
    A("> ⚠️ 本包**不含任何真值**。看到 `E3_*` 请去 Vault 取，不要问导出者要明文。\n")
    A("---\n")

    # 3 阻塞
    A("## 3. 未决与阻塞\n")
    A("### 阻塞（当前卡住的事）\n")
    A(fence(blk, "⚠️ 导出时未填写 —— 交接方补充后再发") + "\n")
    A("### 下一步（紧接着要做的动作）\n")
    A(fence(nxt, "⚠️ 导出时未填写") + "\n")
    A("---\n")

    # 4 接手校验
    A("## 4. 接手校验（必做）\n")
    A("**读完本包后，你必须能回答这四个问题。任何一个答不上——回问导出者，不许猜，不许动手。**\n")
    A("| # | 问题 | 答不上怎么办 |")
    A("|---|---|---|")
    A("| 1 | 这个项目是什么？为谁做？ | 重读第 1 节 M |")
    A("| 2 | 现在做到哪了？卡在哪？ | 快照过期 → 回问导出者 |")
    A("| 3 | 下一步具体做什么？（1–3 个动作） | 同上 |")
    A("| 4 | 我绝对不能碰什么？ | **禁止动手**，先问清边界 |")
    A("")
    A("**校验通过后，第一件事**：更新 `State.md` 的「下一步」，让下一个人知道你接住了。\n")
    A("---\n")
    A("> 本文件由 `scripts/handoff.py` 生成。手写必过期。规范见 `docs/交接协议.md`。\n")

    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description="生成 HANDOFF.md 单文件交接包")
    ap.add_argument("project", nargs="?", default=".", help="项目目录（默认当前目录）")
    ap.add_argument("-o", "--out", default=None, help="输出路径（默认写到项目根 HANDOFF.md）")
    ap.add_argument("--author", default=os.environ.get("USER", "未署名"), help="导出者")
    ap.add_argument("--stdout", action="store_true", help="打到标准输出，方便直接粘贴")
    a = ap.parse_args()

    root = os.path.abspath(a.project)
    if not os.path.isdir(root):
        print(f"✗ 目录不存在: {root}", file=sys.stderr)
        sys.exit(1)

    print(f"→ 扫描 {root}", file=sys.stderr)
    doc = build(root, a.author)

    print("\n交接前自检:", file=sys.stderr)
    for o in OK:
        say("✓", o)
    for w in WARN:
        say("!", w)
    if not WARN:
        say("✓", "无阻塞、无遗留 TODO —— 可以交接")

    if a.stdout:
        sys.stdout.write(doc)
        return

    out = a.out or os.path.join(root, "HANDOFF.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    size = os.path.getsize(out)
    missing = [fn for fn, _, _ in KERNEL if read(os.path.join(root, fn)) is None]
    print(f"\n✓ 已生成 {out}（{size} 字节，约 {size // 1024} KB）", file=sys.stderr)
    if missing:
        print("✗ 但内核缺失，交接包不完整 —— 补齐后再交接。", file=sys.stderr)
        sys.exit(2)
    print("  可直接粘贴给任何 Agent，或随项目一起发出。", file=sys.stderr)


if __name__ == "__main__":
    main()
