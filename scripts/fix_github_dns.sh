#!/usr/bin/env bash
# 修复沙箱/容器内的 GitHub DNS 污染
#
# 症状：github.com 被解析到 198.18.x.x（RFC 2544 保留网段，黑洞地址）
#       TCP 建连成功但 TLS 握手必断，git / curl 全部超时
#
# 坑中坑：DoH 返回的 IP 本身也可能是坏节点。
#       实测阿里 DoH 给的 20.205.243.166 不可达（HTTP 000），
#       而 140.82.112.4 / 140.82.114.4 正常。
#       所以本脚本对每个候选 IP 做真实连通性探测，选可用的写。
#
# 用法：sudo bash scripts/fix_github_dns.sh   （可重复执行，幂等）

set -uo pipefail

HOSTS="/etc/hosts"
MARK_BEGIN="# >>> github-dns-fix"
MARK_END="# <<< github-dns-fix"

# 域名 -> 候选 IP（DoH 查询结果 + GitHub 已知段，脚本会逐个探测）
declare -A CANDIDATES=(
  ["github.com"]="140.82.112.3 140.82.112.4 140.82.114.3 140.82.114.4 20.205.243.166"
  ["api.github.com"]="140.82.112.5 140.82.112.6 140.82.114.5 140.82.114.6 20.205.243.168"
  ["codeload.github.com"]="140.82.113.9 140.82.113.10 140.82.115.9 20.205.243.165"
  ["objects.githubusercontent.com"]="185.199.108.133 185.199.109.133 185.199.110.133 185.199.111.133"
  ["raw.githubusercontent.com"]="185.199.108.133 185.199.109.133 185.199.110.133 185.199.111.133"
)

# DoH 源（多源冗余）
DOH_LIST=(
  "https://dns.alidns.com/resolve?name=%s&type=A"
  "https://doh.pub/dns-query?name=%s&type=A"
)

probe() {
  # 用 --resolve 直连测试，返回 http_code（000 表示不可达）
  curl -sS -m 8 -o /dev/null -w "%{http_code}" \
       --resolve "$1:443:$2" "https://$1/" 2>/dev/null || echo "000"
}

query_doh() {
  local domain="$1" url
  for tpl in "${DOH_LIST[@]}"; do
    url=$(printf "$tpl" "$domain")
    curl -sS -m 10 "$url" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(' '.join(a['data'] for a in d.get('Answer', []) if a['type'] == 1))
except Exception:
    print('')
" && return
  done
}

# ---- 清理旧段落（幂等）----
if grep -q "$MARK_BEGIN" "$HOSTS" 2>/dev/null; then
  python3 - "$HOSTS" "$MARK_BEGIN" "$MARK_END" <<'PY'
import sys
path, begin, end = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path, encoding='utf-8').read().splitlines()
out, skip = [], False
for ln in lines:
    if ln.strip() == begin: skip = True; continue
    if ln.strip() == end:   skip = False; continue
    if not skip: out.append(ln)
open(path, 'w', encoding='utf-8').write("\n".join(out) + "\n")
PY
fi

echo "探测可用节点（DNS 查询 + 真实连通性验证）："
echo

PICKED=()
for domain in "${!CANDIDATES[@]}"; do
  pool="${CANDIDATES[$domain]} $(query_doh "$domain")"
  chosen=""
  for ip in $pool; do
    # 000 = 建连失败（含 TLS 握手失败）；其余任何状态码都说明链路是通的
    # （objects.githubusercontent.com 根路径会返回 403，仍属可用）
    code=$(probe "$domain" "$ip")
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      chosen="$ip"; break
    fi
  done
  if [ -n "$chosen" ]; then
    printf "  ✓ %-32s -> %-18s (HTTP %s)\n" "$domain" "$chosen" "$code"
    PICKED+=("$chosen $domain")
  else
    printf "  ✗ %-32s -> 无可用节点\n" "$domain"
  fi
done

{
  echo "$MARK_BEGIN  (fix_github_dns.sh 生成，可安全重跑)"
  for line in "${PICKED[@]}"; do echo "$line"; done
  echo "$MARK_END"
} >> "$HOSTS"

echo
if [ "${#PICKED[@]}" -gt 0 ]; then
  echo "[✓] 已写入 ${#PICKED[@]} 条到 $HOSTS"
  echo "    git 推送：export GIT_ASKPASS=<askpass.sh>; git push origin main"
else
  echo "[!] 全部失败，检查网络后重跑"
  exit 1
fi
