# 道德经 · 炼化

> 把《道德经》课程（文字 + 视频）炼化成结构化知识，再固化为可复用的技能。

| | |
|---|---|
| **仓库** | https://github.com/batcatchina/daodejing |
| **线上** | https://daodejing.zheng-he.top （备用 https://daodejing-lianhua.vercel.app） |

主题：宇宙论 · 处世 · 修身 · 治国 · 辩证 · 无为
产物：本意 / 引申义 / 启迪（三段式）

---

## 一、这套系统在做什么

```
                    ┌──────────────┐
   文字稿 ─────────▶│              │
                    │   炼化管道   │──▶ 结构化知识 ──▶ 技能文件 SKILL.md
   视频/字幕 ──────▶│   refine.py  │         │
                    └──────────────┘         └──▶ 网站（本意 / 引申义 / 启迪）
```

**三段式**是核心产物，每一章都产出三层：

| 层 | 字段 | 回答什么问题 |
|---|---|---|
| 本意 | `benyi` | 字词训诂、原文直解、先秦语境——老子原本在说什么 |
| 引申义 | `yinshen` | 由此及彼、前后章互证——这一章在 81 章体系里站在哪 |
| 启迪 | `qidi` | 分「人生 / 自然 / 宇宙」三层——对我有什么用、怎么用 |

---

## 一点五、环境坑位备忘

### GitHub 连不上？是 DNS 污染，不是墙

容器/沙箱里 `github.com` 常被解析到 `198.18.x.x`（RFC 2544 保留网段，黑洞地址）。
TCP 建连会成功，但 **TLS 握手必断**，表现为 `SSL_ERROR_SYSCALL` 或 `HTTP:000`。

```bash
# 一键修复（支持重复执行）
bash scripts/fix_github_dns.sh
```

脚本用阿里公共 DNS 的 DoH 接口查真实 IP 写入 `/etc/hosts`，覆盖 5 个域名：
`github.com` / `api.github.com` / `codeload.github.com` / `objects.githubusercontent.com` / `raw.githubusercontent.com`。

> 沙箱休眠唤醒后 hosts 会重置，重跑一次即可。

### 推送方式

**首选：SSH + deploy key**（稳，绕开一切 TLS 问题）

```bash
ssh-keygen -t ed25519 -C "daodejing-deploy" -f ~/.ssh/id_ed25519_daodejing -N ""
# 把公钥加到仓库 Settings → Deploy keys，勾 Allow write access
git remote set-url origin git@github.com:batcatchina/daodejing.git
export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_daodejing -o IdentitiesOnly=yes"
git push origin main
```

**备选：HTTPS + askpass**（token 不落盘）

```bash
export GIT_ASKPASS=/tmp/ghask.sh GIT_TERMINAL_PROMPT=0
git push origin main
```

`ghask.sh` 只做 echo，不存明文：

```sh
#!/bin/sh
case "$1" in
  *Username*) echo "batcatChina" ;;
  *Password*) echo "$PAT" ;;
esac
```

> **坑**：本环境 `curl` 用 OpenSSL、`git` 用 GnuTLS。HTTPS 推送会报
> `gnutls_handshake() failed: The TLS connection was non-properly terminated`，
> 且 `git -c http.sslBackend=openssl` 不可用（该 git 只编译了 gnutls）。
> 表现为 `curl` 通、`git` 不通——**遇到这个直接换 SSH**。
> 另：`git -c http.extraheader=...` 在 git 2.43 下对 push 不生效，会退回交互式要密码。

### GitHub topics 不接受中文

`topics` 必须是小写字母或数字开头，中文主题写进 **description**，同样能在仓库首页一眼看到。

### 自定义域名（已配置完成）

**https://daodejing.zheng-he.top**

`zheng-he.top` 的 DNS 在**阿里云万网**（NS: `dns15.hichina.com`），不由 Vercel 托管，需手动加解析：

| 类型 | 主机记录 | 记录值 | 状态 |
|---|---|---|---|
| CNAME | `daodejing` | `cname.vercel-dns.com` | ✅ 已生效 |

验证结果：

```
CNAME: daodejing.zheng-he.top -> cname.vercel-dns.com
A记录: 76.76.21.61 / 66.33.60.130   （Vercel CDN）
```

> 注：沙箱到 Vercel CDN 的 IP 段整体不可达，只能从 Vercel 侧确认（`verified=true` + 绑定最新 deployment）。
> 实际访问请在本地浏览器打开验证。

---

## 二、快速开始

```bash
# 1. 初始化 81 章地基（原文 + 自动打标签）
python3 scripts/refine.py init

# 2. 导入素材
python3 scripts/refine.py ingest-text  data/raw/讲义.md
python3 scripts/refine.py ingest-video data/raw/第01讲.srt

# 3. 炼化
python3 scripts/refine.py refine 1              # 单章
python3 scripts/refine.py refine --all --engine llm --force

# 4. 产出（索引 + 技能文件 + 前端数据）
python3 scripts/refine.py build

# 5. 部署
export VERCEL_TOKEN=vcp_xxx
python3 scripts/deploy.py --alias daodejing-lianhua
```

查看进度：`python3 scripts/refine.py status`

---

## 三、导入素材的格式约定

**文字稿**：用 `第X章` 或 `1. ` 开头，系统自动切分归位到对应章节。

```markdown
第一章
道可道，非常道。这里的第一个"道"是名词……

第八章
上善若水……
```

**视频**：支持 `.srt` / `.vtt` / `.txt`。字幕会自动剥离时间轴，只留文本；同样按章节号归位。

导不进去也不怕——识别不到章节号时，素材会原样归档到 `data/raw/`，不会丢。

---

## 四、炼化引擎

两种模式：

| 引擎 | 命令 | 说明 |
|---|---|---|
| `template` | 默认 | 生成结构骨架 + 待办标注，**不编造任何解读** |
| `llm` | `--engine llm` | 调用大模型生成三段式，需配置环境变量 |

LLM 引擎配置（OpenAI 兼容接口均可）：

```bash
export LLM_API_KEY=sk_xxx
export LLM_BASE_URL=https://api.openai.com/v1   # 可换成任意兼容端点
export LLM_MODEL=gpt-4o-mini
python3 scripts/refine.py refine --all --engine llm
```

> 提示词会把该章已导入的课程讲义一并送入模型，所以**课程的独到见解会被吸收进解读**，而不是让模型凭通识泛泛而谈。

---

## 五、目录结构

```
daodejing/
├── SKILL.md              技能文件（自动生成，供 AI 加载）
├── data/
│   ├── chapters/         81 章，每章一个 JSON
│   ├── raw/              原始素材归档
│   └── index.json        汇总索引
├── public/               网站静态文件
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── data/index.json   前端数据（build 时同步）
├── scripts/
│   ├── refine.py         炼化管道
│   ├── deploy.py         Vercel 部署器
│   ├── seed_demo.py      示范炼化内容
│   └── _source_p*.py     81 章原文语料
└── docs/                 文档
```

---

## 六、安全提醒

- **不要**把 token 写进任何文件。本项目所有 token 一律走环境变量。
- 若 token 曾在对话或日志中明文出现过，请在 Vercel / GitHub 后台 **revoke 后重新生成**。
- `scripts/` 下的脚本不会回显 token。

---

## 七、当前进度

81 章原文全部就位，自动打好主题与关键词标签。

已炼化 5 章作为质量标准样本：**第 1、8、11、25、64 章**。

剩余 76 章待导入课程素材后批量炼化。
