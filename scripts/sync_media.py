#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_media.py —— 授课稿清单 → data/index.json 的**单向**回写

用法:
    python3 scripts/sync_media.py              # 只看将要变什么（默认 dry-run）
    python3 scripts/sync_media.py --apply      # 确认后落写（自动备份）
    python3 scripts/sync_media.py --check      # 只体检：计数、双写一致性、孤儿文件

它管两件事:
    ① has_media —— 由 manifest.json 单向回写。人是源，index.json 是影子。
    ② 顺手体检 —— refined 计数与 detail 键数是否一致、丹字/丹诀是否与 detail 双写一致。

【为什么必须是单向的】
    双向写等于两份真值。过不了三天就没人知道哪份对。
    所以：manifest 是唯一来源，index.json 只许被这个脚本改这一项。

【为什么不自动改内核】
    detail / original / danzi 这些是内核或半内核，
    本脚本**只报差异，绝不擅自回写** —— 相可以自动，君不可以。
"""

import argparse
import datetime
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "assets", "media", "manifest.json")
INDEX = os.path.join(ROOT, "data", "index.json")
MEDIA_DIR = os.path.join(ROOT, "assets", "media")

WARN, OK = [], []


def say(tag, msg):
    print(f"  [{tag}] {msg}", file=sys.stderr)


def load_json(path, required=True):
    if not os.path.isfile(path):
        if required:
            print(f"✗ 找不到 {path}", file=sys.stderr)
            sys.exit(1)
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def media_ids(man):
    """清单里登记过、且文件确实在磁盘上的章号"""
    ids, missing, listed = set(), [], set()

    for c in man.get("chapters", []):
        cid = int(c["id"])
        listed.add(cid)
        files = c.get("files") or []
        if not files:
            WARN.append(f"第 {cid} 章在清单里却没有登记任何文件 —— 该章不算有稿")
            continue

        broken = False
        for f in files:
            name = f.get("name", "")
            p = os.path.join(MEDIA_DIR, name)
            if not os.path.isfile(p):
                missing.append((cid, name))
                broken = True
                continue
            real = os.path.getsize(p)
            if isinstance(f.get("bytes"), int) and f["bytes"] != real:
                WARN.append(f"{name} 大小对不上（清单 {f['bytes']} / 磁盘 {real}）")
        # 登记的每一份都在，才算得上"有稿"
        if not broken:
            ids.add(cid)

    for cid, name in missing:
        WARN.append(f"清单上写着 {name}，磁盘上没有 —— 第 {cid} 章不计入 has_media")

    # 磁盘上有目录、清单上没登记
    orphan = set()
    if os.path.isdir(MEDIA_DIR):
        for d in sorted(os.listdir(MEDIA_DIR)):
            if d.isdigit() and int(d) not in listed:
                orphan.add(int(d))
    if orphan:
        WARN.append(f"磁盘上有目录却没入清单：第 {sorted(orphan)} 章 —— 补进 manifest.json 才会生效")

    return ids


def check_counts(data):
    """外延的账：这些数全是可重算的，对不上说明有人手改过"""
    detail = data.get("detail", {})
    chapters = data.get("chapters", [])
    refined = sum(1 for c in chapters if str(c["id"]) in detail)

    if data.get("total") != len(chapters):
        WARN.append(f"total={data.get('total')} 与实际章数 {len(chapters)} 不符")
    else:
        OK.append(f"total 一致：{len(chapters)} 章")

    if data.get("refined") != refined:
        WARN.append(f"refined={data.get('refined')} 但 detail 里实际有 {refined} 章金丹")
    else:
        OK.append(f"refined 一致：{refined} 章已成丹")

    # 半内核：双写但不自动回写，只报差异
    drift = []
    for c in chapters:
        d = detail.get(str(c["id"]))
        if not d:
            continue
        for k in ("danzi", "danjue"):
            if d.get(k) and c.get(k) != d[k]:
                drift.append(f"第 {c['id']} 章 {k}：chapters『{c.get(k)}』≠ detail『{d[k]}』")
    if drift:
        WARN.append("丹字/丹诀双写不一致（**不自动改**，交人判）：")
        for line in drift[:10]:
            WARN.append("      " + line)


def main():
    ap = argparse.ArgumentParser(description="授课稿清单 → index.json 单向回写")
    ap.add_argument("--apply", action="store_true", help="确认无误后落写")
    ap.add_argument("--check", action="store_true", help="只体检，不看 has_media")
    a = ap.parse_args()

    man = load_json(MANIFEST, required=not a.check)
    data = load_json(INDEX)

    print(f"→ 清单 {os.path.relpath(MANIFEST, ROOT)}", file=sys.stderr)
    print(f"→ 丹目 {os.path.relpath(INDEX, ROOT)}", file=sys.stderr)

    ids = media_ids(man) if man else set()
    check_counts(data)

    # has_media 差异
    changes = []
    for c in data.get("chapters", []):
        want = c["id"] in ids
        if bool(c.get("has_media")) != want:
            changes.append((c["id"], bool(c.get("has_media")), want))
    if changes:
        say("·", f"has_media 有 {len(changes)} 处待改（清单上共 {len(ids)} 章有稿）")
        for cid, old, new in changes[:20]:
            say("→", f"第 {cid:>2} 章：has_media {old} → {new}")
    else:
        OK.append(f"has_media 已是最新（{len(ids)} 章有稿）")

    print("\n自检:", file=sys.stderr)
    for o in OK:
        say("✓", o)
    for w in WARN:
        say("!", w)
    if not WARN:
        say("✓", "清单与磁盘、丹目三者一致")

    if a.check or not (changes or a.apply):
        say("·", "只体检，未写入。要写就加 --apply")
        return

    if not a.apply:
        say("·", "有差异但未加 --apply —— 未写入")
        return

    # 落写：备份先行，且保持紧凑格式（与原文件同一风格）
    bak = INDEX + ".bak"
    with open(bak, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    say("·", f"已备份原文件 → {os.path.relpath(bak, ROOT)}")

    for c in data["chapters"]:
        c["has_media"] = c["id"] in ids
    data["updated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    say("✓", f"已回写 {len(changes)} 处 has_media，updated 刷新为 {data['updated']}")
    say("·", "内核 untouched —— 本脚本从不改 original / detail / danzi")


if __name__ == "__main__":
    main()
