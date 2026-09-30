# ○ TOOLS.md —— 公开外延 E1（阳鱼主体 / 圆内环）

> 可直接读，随便重写。回答：有什么工具、什么命令、什么路径？
>
> 本文件属于**可重建**那一层——丢了照着它能再造出来，所以不必战战兢兢。

## 一、运行环境

| 项 | 值 |
|---|---|
| 形态 | **线上站点**是纯静态（零运行时后端）；**仓库**带构建与部署管道 |
| 前端 | 原生 ES2017+，`<script>` 直接挂（非 module，故全局作用域） |
| 脚本 | Python 3.11+，标准库即可（`argparse / re / json / datetime`） |
| 浏览器 | 现代浏览器；不用 localStorage，不写 cookie |
| 依赖资产 | 规范数据 `data/chapters/*.json`；聚合 `data/index.json`；部署副本 `public/data/index.json` |
| 部署 | Vercel，`vercel.json` 指定 `outputDirectory: public` |

有 `package.json` 但**没有第三方依赖**；没有 CDN，没有 font-face，没有 Analytics。
炼化管道 `scripts/refine.py` 可选接 LLM（见 `.env.example` 的 `LLM_*`），不配也能跑模板档。

## 二、常用命令

| 做什么 | 命令 |
|---|---|
| **本地起服务**（唯一正确的打开方式，站点在 `public/`） | `python3 -m http.server 8080 --directory public`（＝ `npm run serve`） |
| 语法体检（改完 JS 立刻跑） | `node --check public/<file>.js` |
| 改了 `data/chapters/` 后重建索引与技能文件 | `python3 scripts/refine.py build`（＝ `npm run build`） |
| 看炼化进度 | `python3 scripts/refine.py status`（＝ `npm run status`） |
| 上线部署 | `python3 scripts/deploy.py --alias daodejing-lianhua`（＝ `npm run deploy`） |
| **交接前自检** ／生成 `HANDOFF.md` | `python3 scripts/handoff.py .` |
| 打成单文件到标准输出（直接粘给别的 Agent） | `python3 scripts/handoff.py . --stdout` |
| 经验蒸馏：流水 → 候选 | `python3 scripts/distill.py` |
| 勾选后落进内核 | `python3 scripts/distill.py --apply` |
| 媒体链路体检 | `python3 scripts/sync_media.py --check` |
| 看 `has_media` 将要怎么变（dry-run） | `python3 scripts/sync_media.py` |
| 确认后回写 `has_media` | `python3 scripts/sync_media.py --apply` |

⚠️ **`file://` 直接打开必空**——`fetch('./data/index.json')` 在本地文件协议下读不到东西。

## 三、路径约定

| 路径 | 装什么 | 定性 |
|---|---|---|
| `Memory.md` `Readme.md` `State.md` `Journal.md` | ● 内核／◐ 半内核 | 不可重建 |
| `TOOLS.md` `repos.md` `.env.example` `secrets/README.md` | ○ 外延 | 可重建 |
| `scripts/` | 原有：`refine.py`（炼化／构建）`deploy.py` `site_check.py` `ask.py` 等；本轮新增：`handoff.py` `distill.py` `sync_media.py` | ○ 可重建 |
| `data/chapters/001~081.json` | **规范源**：每章原文与 `refined.*` | 混血：`original` 与 `refined` 为内核，`ferocity` 为外延 |
| `data/index.json` | 聚合索引（`chapters[]` + `detail{}`） | 混血，同上 |
| `public/data/index.json` | 部署副本，**`refine.py build` 生成，勿手改** | ○ 可重建 |
| `assets/media/<两位章号>/` | 授课稿与转写稿（**视频本体不在此**） | ○ 可重建（有备份另论） |
| `assets/media/manifest.json` | 媒体清单，`has_media` 的唯一来源 | ○ 可重建 |
| `public/*.html` | 站点页面：`index` `ask` `refine` `vault` ＋本轮新增 `model.html` | ○ 可重建 |
| `public/*.js` | `spirits.js`（角色）`furnace.js`（火候）`ask.js`（检索）`ingest.js`（投料）`app.js`（首页）`vault.js` `ask-page.js` | ○ 可重建 |

外部交付目录见项目约定；本项目只在仓库内自给自足，不往别处写东西。

## 四、外部依赖与知识来源

| 来源 | 用在哪 | 是否需要凭证 |
|---|---|---|
| https://taiji.zheng-he.top | MRS-EV 太极·点圆统一模型 v1.1（本体系的原型） | 否 |
| 用户自贴的网址 | `refine.html` 的「网址抓取」通道，`INGEST.fetchUrl` | 否（浏览器直连，不带凭证） |
| 本地 whisper / 云端 ASR | 课程视频转写（在沙箱侧做，不入前端） | 需要时见凭证引用表 `E3_TRANSCRIBE_API_KEY` |
| 项目网盘／对象存储 | 课程音视频本体存放 | 需要时见 `E3_MEDIA_BUCKET` |

> 所需密钥见 `Readme.md` 凭证引用表（E3_ref），**本文件不写值**。
