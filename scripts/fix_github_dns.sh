#!/usr/bin/env bash
# 修复沙箱/容器内的 GitHub DNS 污染
#
# 症状：github.com 被解析到 198.18.x.x（RFC 2544 保留网段，黑洞地址）
#       TCP 能建连，但 TLS 握手必失败，git / curl 全部超时
#
# 原理：绕过本地 DNS，用阿里公共 DNS 的 DoH 接口查真实 IP，写进 /etc/hosts
#
# 用法：sudo bash scripts/fix_github_dns.sh
#       （沙箱每次休眠唤醒后 hosts 会重置，重跑一次即可）

set -euo pipefail

DOH="https://dns.alidns.com/resolve"
HOSTS="/etc/hosts"
MARK_BEGIN="# >>> github-dns-fix"
MARK_END="# <<< github-dns-fix"

DOMAINS=(
  github.com
  api.github.com
  codeload.github.com
  objects.githubusercontent.com
  raw.githubusercontent.com
)

resolve() {
  curl -sS -m 12 "${DOH}?name=${1}&type=A" \
    | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ips = [a['data'] for a in d.get('Answer', []) if a['type'] == 1]
    print(ips[0] if ips else '')
except Exception:
    print('')
"
}

# 清理上一次写入的段落
if grep -q "$MARK_BEGIN" "$HOSTS" 2>/dev/null; then
  python3 - "$HOSTS" "$MARK_BEGIN" "$MARK_END" <<'PY'
import sys
path, begin, end = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path, encoding='utf-8').read().splitlines()
out, skip = [], False
for ln in lines:
    if ln.strip() == begin:
        skip = True; continue
    if ln.strip() == end:
        skip = False; continue
    if not skip:
        out.append(ln)
open(path, 'w', encoding='utf-8').write("\n".join(out) + "\n")
PY
fi

{
  echo "$MARK_BEGIN  (由 fix_github_dns.sh 生成，可安全重跑)"
} >> "$HOSTS"

ok=0
for d in "${DOMAINS[@]}"; do
  ip="$(resolve "$d")"
  if [ -n "$ip" ]; then
    echo "$ip $d" >> "$HOSTS"
    printf "  %-32s -> %s\n" "$d" "$ip"
    ok=$((ok + 1))
  else
    printf "  %-32s -> 解析失败，跳过\n" "$d"
  fi
done

echo "$MARK_END" >> "$HOSTS"

echo
if [ "$ok" -eq "${#DOMAINS[@]}" ]; then
  echo "[✓] 已写入 $ok 条，验证："
  curl -sS -m 15 -o /dev/null -w "    api.github.com -> HTTP %{http_code}\n" https://api.github.com || true
else
  echo "[!] 仅写入 $ok/${#DOMAINS[@]} 条，请检查网络后重跑"
fi
