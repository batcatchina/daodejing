#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
站点健康检查（供 GitHub Actions 使用）
校验线上是否为炼化炉 v2：首页、藏丹阁二级页、静态资源、数据接口、三维、金丹字
"""
import json
import sys
import urllib.request

BASE = "https://daodejing.zheng-he.top"
ASSETS = ["furnace.js", "app.js", "vault.js", "style.css", "data/index.json"]


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

    # 2. 首页（炼化炉）
    print("\n── 首页 · 炼化炉 ──")
    try:
        html = get("")
        title = html.split("<title>")[1].split("</title>")[0] if "<title>" in html else "无"
        print(f"  标题：{title}")
        print(f"  体积：{len(html)} bytes")
        for token, label in [("炼化炉", "炉名"), ("开 炉 炼 化", "炼化按钮"),
                             ("投 料 入 炉", "炉口"), ("gateways", "入口区")]:
            ok = token in html
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(label)

        # 首页应只留入口，不再内嵌藏丹阁网格
        if 'id="grid"' in html:
            print("  ✗ 首页仍内嵌藏丹阁网格（应拆为二级页）")
            failed.append("首页未拆分")
        else:
            print("  ✓ 首页已收敛（藏丹阁已拆至二级页）")

        for cls, label in [("done-gate", "已炼化入口"),
                           ("raw-gate", "未炼化入口"),
                           ("all-gate", "全部入口")]:
            ok = cls in html
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(label)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ 首页失败：{e}")
        failed.append("首页")

    # 2b. 藏丹阁（二级页）
    print("\n── 藏丹阁 · 二级页 ──")
    try:
        vh = get("vault.html")
        vtitle = vh.split("<title>")[1].split("</title>")[0] if "<title>" in vh else "无"
        print(f"  标题：{vtitle}")
        print(f"  体积：{len(vh)} bytes")
        for token, label in [("藏 丹 阁", "阁名"), ('id="tabs"', "分栏签"),
                             ('data-status="refined"', "已炼化签"),
                             ('data-status="pending"', "未炼化签"),
                             ('id="search"', "检索框"),
                             ('class="back"', "返回炉")]:
            ok = token in vh
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"藏丹阁/{label}")

        # 二级页直达参数
        for st, label in [("refined", "?status=refined"), ("pending", "?status=pending")]:
            try:
                get(f"vault.html?status={st}", raw=True)
                print(f"  ✓ {label} 可访问")
            except Exception as e:  # noqa: BLE001
                print(f"  ✗ {label} 失败：{e}")
                failed.append(label)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ 藏丹阁失败：{e}")
        failed.append("藏丹阁")

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
    print("[✓] 全部通过 —— 炼化炉 v2 + 藏丹阁二级页 已上线")


if __name__ == "__main__":
    main()
