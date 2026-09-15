# 道德经 · 炼化炉

> 投入章句，炼出金丹。一字一重天。

| | |
|---|---|
| **仓库** | https://github.com/batcatchina/daodejing |
| **线上** | https://daodejing.zheng-he.top （备用 https://daodejing-lianhua.vercel.app） |

主题：宇宙论 · 处世 · 修身 · 治国 · 辩证 · 无为

---

## 一、这套系统在做什么

```
                    ┌──────────────┐      ┌─────────────┐
   文字稿 ─────────▶│              │      │  一字金丹   │
                    │   炼化炉     │─────▶│  一句丹诀   │──▶ 技能 SKILL.md
   视频/字幕 ──────▶│  refine.py   │      │  本意引申   │──▶ 网站 · 金丹
                    └──────────────┘      │  三维系辞   │
                           ▲              └─────────────┘
                           │
                     火候判定（宽进严出）
```

### 金丹的形态：由简入深，多档呈现

| 档 | 字段 | 说明 |
|---|---|---|
| **一字** | `danzi` | 一字金丹。全章精神凝于一字，一字一重天 |
| **一句** | `danjue` | 一句丹诀。摄全章之要，不超过 20 字 |
| **本意** | `benyi` | 字词训诂、原文直解、先秦语境——老子原本在说什么 |
| **引申义** | `yinshen` | 前后章互证——这一章在 81 章体系里站在哪 |
| **三维** | `wei` | 人生·自主 / 健康·养生 / 自然·宇宙 |

浅看一字，深究一境。

### 火候判定：宽进严出

**什么都能投进炉子，但炼不出真东西就不结丹。**

判三件事：

| 维度 | 问的什么 | 权重 |
|---|---|---|
| **根** | 是否扣住原文章句？ | 最高（45） |
| **料** | 是否有实质内容？ | 中（20） |
| **向** | 是否合《道德经》义理？ | 中（25） |

另有扣分项：口号式激励、流行话术（"格局""底层逻辑""降维打击"）、绝对化断言、纯情绪短句。

**底线：无原文之根者，一律不结丹。** 炉火再旺，无根之木炼不出丹。

实测判定：

| 输入 | 判定 |
|---|---|
| 上善若水，水善利万物而不争，处众人之所恶，故几于道。 | 上品·可炼（78） |
| 第11章 有之以为利，无之以为用，对我做产品很有启发 | 中品·可炼（68） |
| 反者道之动，弱者道之用，这是循环的智慧 | 中品·可炼（58） |
| 道可道非常道，语言不能穷尽实在 | 下品·勉炼（48，扣第1章） |
| 加油，相信自己，你一定能成功！ | **火候未到** |
| 格局打开的底层逻辑就是降维打击 | **火候未到** |
| 今天天气真好我想去吃火锅 | **火候未到** |

判定同时在**浏览器端**（`public/furnace.js`）与**命令行**（`scripts/goldwords.py`）实现，逻辑同源。
即时反馈不用等网络。

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

#### 坑：绑定域名后必须再部署一次

通过 API 添加自定义域名，Vercel 会立刻返回 `verified=true`——**但此时访问仍是 TLS 握手失败**（`code=000`）。
因为域名只是"登记"了，还没有对应的 deployment 路由与证书。

**必须再跑一次部署，域名才会真正生效。**

```bash
python3 scripts/deploy.py --alias daodejing-lianhua --domain daodejing.zheng-he.top
# 首次返回 409 domain_already_in_use 是正常的（表示已登记），
# 关键是这次部署会触发路由与证书签发
```

实测对照（同一时刻，海外机器）：

| URL | 绑定后未重部署 | 重部署后 |
|---|---|---|
| `daodejing.zheng-he.top` | ❌ code=000 | ✅ 200 |
| `daodejing-lianhua.vercel.app` | ✅ 200 | ✅ 200 |
| `www.zheng-he.top` | ✅ 200 | ✅ 200 |

#### 无法本地验证时怎么办

沙箱到 Vercel CDN 的 IP 段整体不可达，本地 curl 一律 `code=000`。
可在仓库里放一个 GitHub Actions workflow，用海外 runner 代跑探测：

```bash
# 手动触发
curl -X POST -H "Authorization: Bearer $PAT" \
  https://api.github.com/repos/batcatchina/daodejing/actions/workflows/site-check.yml/dispatches \
  -d '{"ref":"main"}'
```

> 取日志需先把 `results-receiver.actions.githubusercontent.com` 也加进 hosts，否则日志下载 404。

---

## 二、快速开始

```bash
# 1. 初始化 81 章地基（原文 + 自动打标签）
python3 scripts/refine.py init

# 2. 试火候（判断一段输入配不配结丹）
python3 scripts/refine.py assay "上善若水，水善利万物而不争"

# 3. 导入素材
python3 scripts/refine.py ingest-text  data/raw/讲义.md
python3 scripts/refine.py ingest-video data/raw/第01讲.srt

# 4. 炼化结丹
python3 scripts/refine.py refine 1                       # 单章
python3 scripts/refine.py refine --all --engine llm --force   # 全量

# 5. 产出（索引 + 技能文件 + 前端数据）
python3 scripts/refine.py build

# 6. 部署
export VERCEL_TOKEN=vcp_xxx
python3 scripts/deploy.py --alias daodejing-lianhua --domain daodejing.zheng-he.top
```

查看进度：`python3 scripts/refine.py status`

```
章节总数：81
已结丹　：5
　　　　　1:玄  8:水  11:无  25:法  64:慎
有素材　：0
待结丹　：76 章
```

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
│   ├── index.html        炼化炉 + 藏丹阁
│   ├── style.css         水墨古典样式
│   ├── furnace.js        火候判定（浏览器端）
│   ├── app.js            主逻辑
│   └── data/index.json   前端数据（build 时同步）
├── scripts/
│   ├── refine.py         炼化炉主程序
│   ├── goldwords.py      一字金丹表 + 火候判定
│   ├── migrate_to_dan.py 旧结构迁移
│   ├── seed_dan.py       示范金丹
│   ├── deploy.py         Vercel 部署器
│   ├── fix_github_dns.sh GitHub DNS 污染修复
│   └── _source_p*.py     81 章原文语料
└── .github/workflows/
    └── site-check.yml    站点健康检查
```

---

## 六、安全提醒

- **不要**把 token 写进任何文件。本项目所有 token 一律走环境变量。
- 若 token 曾在对话或日志中明文出现过，请在 Vercel / GitHub 后台 **revoke 后重新生成**。
- `scripts/` 下的脚本不会回显 token。

---

## 七、当前进度

81 章原文全部就位，自动打好主题与关键词标签。

已结丹 5 章作为质量标准样本：

| 章 | 一字 | 一句丹诀 |
|---|---|---|
| 1 | **玄** | 道可道，非常道。 |
| 8 | **水** | 上善若水，水善利万物而不争。 |
| 11 | **无** | 有之以为利，无之以为用。 |
| 25 | **法** | 人法地，地法天，天法道，道法自然。 |
| 64 | **慎** | 慎终如始，则无败事。 |

这 5 章的三维（人生·自主 / 健康·养生 / 自然·宇宙）已完整撰写。

剩余 76 章待导入课程素材后批量炼化。
