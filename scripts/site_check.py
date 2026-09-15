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
ASSETS = ["furnace.js", "ask.js", "ask-page.js", "ingest.js", "app.js",
          "vault.js", "style.css", "data/index.json"]


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
                             ("投 料 入 炉", "炉口"), ("gateways", "入口区"),
                             ('aria-label="太极八卦炼丹炉"', "丹炉器型"),
                             ("taiji", "太极"), ("bagua", "八卦"),
                             ("class=\"fire\"", "炉火")]:
            ok = token in html
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(label)

        # 智能投料口四形态
        print("  ── 投料口 ──")
        for token, label in [('class="intake-tabs"', "入口签"),
                             ('data-mode="paste"', "粘贴文本"),
                             ('data-mode="file"', "拖入文件"),
                             ('data-mode="url"', "贴网址"),
                             ('data-mode="av"', "音视频引导"),
                             ('id="drop"', "拖拽区"),
                             ('id="urlInput"', "网址栏"),
                             ('class="av-guide"', "转写引导"),
                             ("ingest.js", "投料模块")]:
            ok = token in html
            print(f"    {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"投料口/{label}")

        # 首页应只留入口，不再内嵌藏丹阁网格
        if 'id="grid"' in html:
            print("  ✗ 首页仍内嵌藏丹阁网格（应拆为二级页）")
            failed.append("首页未拆分")
        else:
            print("  ✓ 首页已收敛（藏丹阁已拆至二级页）")

        # 问道（正门）
        print("  ── 问道（正门）──")
        for token, label in [('id="homeAsk"', "首页问道区"),
                             ('id="homeQ"', "提问框"),
                             ("btn-ask", "问道按钮"),
                             ('id="homeAnswer"', "答面"),
                             ('class="furnace-door"', "炉子内务说明"),
                             ("ask.js", "问道内核")]:
            ok = token in html
            print(f"    {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"问道/{label}")

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

    # 2b2. 问道页
    print("\n── 问道 · 二级页 ──")
    try:
        ah = get("ask.html")
        atitle = ah.split("<title>")[1].split("</title>")[0] if "<title>" in ah else "无"
        print(f"  标题：{atitle}")
        print(f"  体积：{len(ah)} bytes")
        for token, label in [("问 道", "页名"), ('id="q"', "提问框"),
                             ('id="askBtn"', "问道按钮"), ('id="answer"', "答面"),
                             ('id="browse"', "浏览区"), ('data-view="theme"', "主题签"),
                             ('data-view="danzi"', "丹字签"), ('data-view="deep"', "已炼化签"),
                             ('class="back"', "返回炉"), ("ask-page.js", "页面脚本")]:
            ok = token in ah
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"问道页/{label}")

        for q, label in [("%E6%88%91%E5%BE%88%E7%84%A6%E8%99%91", "?q=焦虑")]:
            try:
                get(f"ask.html?q={q}", raw=True)
                print(f"  ✓ {label} 可访问")
            except Exception as e:  # noqa: BLE001
                print(f"  ✗ {label} 失败：{e}")
                failed.append(label)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ 问道页失败：{e}")
        failed.append("问道页")

    # 2d. 问道内核
    print("\n── 问道内核 ──")
    try:
        aj = get("ask.js")
        print(f"  ask.js 体积：{len(aj)} 字节")
        for token, label in [("BRIDGE", "语义桥表"), ("虚静守笃", "簇：虚静"),
                             ("不争之德", "簇：不争"), ("祸福相倚", "簇：祸福"),
                             ("知足知止", "簇：知足"), ("无为顺时", "簇：无为"),
                             ("bridgeAnswer", "① 语义桥"),
                             ("quoteAnswer", "② 语料直检"),
                             ("themeAnswer", "③ 主题降级"),
                             ("danziIndex", "丹字索引"), ("themeIndex", "主题索引")]:
            ok = token in aj
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"问道内核/{label}")
        import re as _re
        n = len(_re.findall(r"key: '", aj))
        print(f"  语义簇数：约 {n}")
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ ask.js 失败：{e}")
        failed.append("ask.js")

    # 2c. 投料模块与四条判据
    print("\n── 投料模块 ──")
    try:
        ing = get("ingest.js")
        print(f"  ingest.js 体积：{len(ing)} bytes")
        for token, label in [("stripSrt", "时间轴剥离"), ("readFile", "文件读取"),
                             ("fetchUrl", "网址抓取"), ("recognize", "料识"),
                             ("tidyPasted", "粘贴稿清理")]:
            ok = token in ing
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"ingest/{label}")
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ ingest.js 失败：{e}")
        failed.append("ingest.js")

    try:
        fj = get("furnace.js")
        for token, label in [("道法自然", "道法自然"), ("非恒道", "非恒道"),
                             ("六度周全", "六度周全"), ("多维度", "多维度"),
                             ("principles", "三问输出"), ("短引优先", "短引匹配")]:
            ok = token in fj
            print(f"  {'✓' if ok else '✗'} {label}")
            if not ok:
                failed.append(f"判据/{label}")
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ furnace.js 失败：{e}")
        failed.append("furnace.js")


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
    print("[✓] 全部通过 —— 炼化炉 v3 + 藏丹阁 + 问道 已上线")


if __name__ == "__main__":
    main()
