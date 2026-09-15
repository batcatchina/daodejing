#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
站点健康检查（供 GitHub Actions 使用）
校验线上是否为炼化炉 v2：首页、静态资源、数据接口、三维、金丹字
"""
import json
import sys
import urllib.request

BASE = "https://daodejing.zheng-he.top"
ASSETS = ["furnace.js", "app.js", "style.css", "data/index.json"]


def get(path, raw=False, timeout=25):
    url = f"{BASE}/{path}" if path else BASE + "/"
    req = urllib.request.Request(url, headers={"User-Agent": "site-check/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        return data if raw else data.decode("utf-8", "ignore")


def main():
    failed = []

    # 1. 静态资源
    print("── 静态资源 ──")
    for a in ASSETS:
        try:
            body = get(a, raw=True)
            print(f"  ✓ {a}  ({len(body)} bytes)")
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {a}  失败：{e}")
            failed.append(a)

    # 2. 首页
    print("\n── 首页 ──")
    try:
        html = get("")
        title = html.split("<title>")[1].split("</title>")[0] if "<title>" in html else "无"
        print(f"  标题：{title}")
        print(f"  体积：{len(html)} bytes")
        for token, label in [("炼化炉", "炉名"), ("开 炉 炼 化", "炼化按钮"),
                             ("投 料 入 炉", "炉口"), ("藏 丹 阁", "藏丹阁")]:
            ok = token in html
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(label)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ 首页失败：{e}")
        failed.append("首页")

    # 3. 数据
    print("\n── 数据 ──")
    try:
        d = json.loads(get("data/index.json"))
        print(f"  章节：{d['total']}　已结丹：{d['refined']}")
        dims = [x["name"] for x in d.get("dimensions", [])]
        print(f"  三维：{' / '.join(dims)}")
        if len(dims) != 3:
            failed.append("三维缺失")

        for cid in (1, 8, 11, 25, 64):
            c = next((x for x in d["chapters"] if x["id"] == cid), None)
            if c and c.get("danzi"):
                print(f"  第{cid:>2}章 丹字「{c['danzi']}」· {c['danjue']}")
            else:
                print(f"  第{cid:>2}章 ✗ 无金丹")
                failed.append(f"第{cid}章")

        det = d.get("detail", {})
        sample = det.get("8", {})
        if sample.get("wei", {}).get("rensheng"):
            print(f"  第8章三维齐备（人生 {len(sample['wei']['rensheng'])} 字）")
        else:
            print("  ✗ 第8章三维缺失")
            failed.append("三维内容")
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ 数据失败：{e}")
        failed.append("数据")

    print()
    if failed:
        print(f"[x] 检查未通过，异常项：{failed}")
        sys.exit(1)
    print("[✓] 全部通过 —— 炼化炉 v2 已上线")


if __name__ == "__main__":
    main()
