#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercel 部署器
=============
直接通过 Vercel API 上传静态文件，不依赖 GitHub 与本地 CLI。

用法：
    export VERCEL_TOKEN=vcp_xxx
    python3 scripts/deploy.py                    # 部署到生产
    python3 scripts/deploy.py --alias daodejing  # 指定项目名
    python3 scripts/deploy.py --domain x.com     # 绑定自定义域名
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
API = "https://api.vercel.com"


def req(method, path, body=None, token=None, retry=3):
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for i in range(retry):
        try:
            r = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(r, timeout=90) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")
            if e.code in (429, 500, 502, 503, 504) and i < retry - 1:
                time.sleep(2 ** i)
                continue
            raise SystemExit(f"[x] Vercel {method} {path} -> {e.code}\n{detail[:600]}")
        except Exception as e:  # noqa: BLE001
            if i < retry - 1:
                time.sleep(2 ** i)
                continue
            raise SystemExit(f"[x] 请求失败：{e}")
    return {}


def collect_files():
    """收集 public/ 下所有文件，映射为部署根路径"""
    files = []
    for p in sorted(PUBLIC.rglob("*")):
        if p.is_dir() or p.name.startswith("."):
            continue
        rel = p.relative_to(PUBLIC).as_posix()
        files.append({"file": rel, "data": p.read_text(encoding="utf-8")})
    return files


def main():
    ap = argparse.ArgumentParser()
    # 注意：daodejing.zheng-he.top 绑在项目 daodejing-lianhua 上，
    # 若部署到同名项目 daodejing 会导致「推了但线上没变」。
    ap.add_argument("--alias", default="daodejing-lianhua")
    ap.add_argument("--domain", default=None, help="自定义域名，如 dao.example.com")
    ap.add_argument("--team", default=None)
    args = ap.parse_args()

    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        raise SystemExit("[x] 请设置环境变量 VERCEL_TOKEN")

    team_q = f"?teamId={args.team}" if args.team else ""

    # 1. 确保项目存在
    try:
        proj = req("GET", f"/v9/projects/{args.alias}{team_q}", token=token)
    except SystemExit:
        proj = {}
    if "id" not in proj:
        print(f"[·] 创建项目 {args.alias} ...")
        proj = req("POST", f"/v10/projects{team_q}", {"name": args.alias}, token=token)
    print(f"[✓] 项目：{proj.get('name')} ({proj.get('id')})")

    # 2. 上传并部署
    files = collect_files()
    if not files:
        raise SystemExit("[x] public/ 为空，无可部署文件")
    print(f"[·] 上传 {len(files)} 个文件：{[f['file'] for f in files]}")

    payload = {
        "name": args.alias,
        "project": proj.get("id"),
        "target": "production",
        "files": files,
        "projectSettings": {"framework": None},
    }
    dep = req("POST", f"/v13/deployments{team_q}", payload, token=token)
    dep_id = dep.get("id")
    print(f"[·] 部署中：{dep_id}")

    # 3. 等待就绪
    for _ in range(60):
        st = req("GET", f"/v13/deployments/{dep_id}{team_q}", token=token)
        state = st.get("status") or st.get("readyState")
        if state in ("READY", "ready"):
            url = st.get("url")
            print(f"[✓] 部署成功：https://{url}")
            break
        if state in ("ERROR", "error", "CANCELED"):
            raise SystemExit(f"[x] 部署失败：{json.dumps(st, ensure_ascii=False)[:600]}")
        time.sleep(3)
    else:
        raise SystemExit("[x] 部署超时")

    # 4. 固定生产别名
    alias = f"{args.alias}.vercel.app"
    try:
        req("POST", f"/v13/deployments/{dep_id}/aliases{team_q}", {"alias": alias}, token=token)
        print(f"[✓] 生产别名：https://{alias}")
    except SystemExit as e:
        print(f"[!] 别名绑定跳过：{e}")

    # 5. 自定义域名
    if args.domain:
        try:
            req("POST", f"/v10/projects/{proj['id']}/domains{team_q}", {"name": args.domain}, token=token)
            print(f"[✓] 域名已绑定：{args.domain}（需在 DNS 处添加 CNAME -> cname.vercel-dns.com）")
        except SystemExit as e:
            print(f"[!] 域名绑定失败：{e}")


if __name__ == "__main__":
    main()
