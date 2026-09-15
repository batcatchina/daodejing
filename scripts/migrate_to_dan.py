#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把旧的 benyi/yinshen/qidi 结构迁移为金丹结构（danzi/danjue/benyi/yinshen/wei）"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CH = ROOT / "data" / "chapters"
sys.path.insert(0, str(ROOT / "scripts"))
from goldwords import GOLD_WORDS, GOLD_LINES, judge_ferocity  # noqa: E402


def migrate():
    n = 0
    for f in sorted(CH.glob("*.json")):
        ch = json.loads(f.read_text(encoding="utf-8"))
        r = ch.get("refined") or {}

        changed = False

        # 1) 补 danzi / danjue
        if "danzi" not in r:
            r["danzi"] = GOLD_WORDS.get(ch["id"], "")
            changed = True
        if "danjue" not in r:
            r["danjue"] = GOLD_LINES.get(ch["id"], "")
            changed = True

        # 2) 补 wei（把旧的 qidi 迁到 rensheng 作起点）
        if "wei" not in r or not isinstance(r.get("wei"), dict):
            old_qidi = r.pop("qidi", "") if "qidi" in r else ""
            r["wei"] = {
                "rensheng": old_qidi or "",
                "jiankang": "",
                "yuzhou": "",
            }
            changed = True
        else:
            r.pop("qidi", None)
            for k in ("rensheng", "jiankang", "yuzhou"):
                r["wei"].setdefault(k, "")

        # 3) 字段顺序规整
        r = {
            "danzi": r.get("danzi", ""),
            "danjue": r.get("danjue", ""),
            "benyi": r.get("benyi", ""),
            "yinshen": r.get("yinshen", ""),
            "wei": r.get("wei", {}),
        }
        ch["refined"] = r

        # 4) 补火候
        if ch.get("ferocity") is None:
            ch["ferocity"] = judge_ferocity(ch["original"])
            changed = True

        if changed:
            f.write_text(json.dumps(ch, ensure_ascii=False, indent=2), encoding="utf-8")
            n += 1

    print(f"[✓] 迁移 {n} 章 -> 金丹结构")


if __name__ == "__main__":
    migrate()
