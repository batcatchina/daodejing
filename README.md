# 道德经 · 炼化

> 把《道德经》课程（文字 + 视频）炼化成结构化知识，再固化为可复用的技能。

在线：**https://daodejing-lianhua.vercel.app**

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
