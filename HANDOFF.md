# HANDOFF — daodejing

> **导出时间**：2026-09-30 11:10  
> **导出者**：未署名  
> **源**：MRS-EV 内核 v1.1 · 由 `scripts/handoff.py` 生成

---

## 0. 引导（接手 Agent 先读这一节，再读别的）

**你是接手方。开工前必须做到：**

1. **按序读第 1 节**，顺序是 M → R → S，不要跳、不要并发读。
2. **第 1 节的 M 是不可违背的硬约束**，不是建议。与你的判断冲突时，以 M 为准。
3. **真值一律不在本包内。** 你只会看到 `E3_*` 引用名，值自己去 Vault 取。
4. **做完第 4 节的接手校验**，答不上就回问，不许猜。

**一句话**：这是别人的项目，你是来接手的，不是来重新定义的。

---

## 1. 内核 ●（原样搬运，不得改写）

### ● M —— 我是谁　`Memory.md`

```markdown
# ● Memory.md —— 自主内核（太极阴鱼 / 实点）

> **内核不轻动。** 这里写的都是长期有效、丢了就重建不出来的东西。
> 回答四问：**我是谁？为何做？原则？边界？**
>
> 接手者先读这里。这里的每一条都是硬约束，不是建议——与你的判断冲突时，以此为准。

## 一、身份（我是谁）

一座**《道德经》AI 智能炼化炉**：把课程内容（文字稿、视频转写稿）与人的私人笔记，
投进炉里炼成「金丹」——对每一章给出**本意（训诂）· 引申义（推演）· 三维（人生自主／健康养生／自然宇宙）**。

炉中有三位**都是 AI**，各司其职，且**只有一个门**：

| 位 | 名 | 干什么 |
|---|---|---|
| 门 | **道童 TONG** | 唯一入口。接料、接问，转交。不判、不取 |
| 炼化线 | **丹师 SHI** | 试火候、判成丹、说其所以然（`furnace.js`） |
| 问道线 | **炉灵 LING** | 守八十一章金丹，替人从八十一章里指出哪几章在回答他（`ask.js`） |

```
                 ┌─ 炼化 → 道童转交 → 丹师试火 → 成丹 / 否丹
     有人来 ─→ 道童 ┤
                 └─ 问道 → 道童转交 → 炉灵取丹 → 金丹 / 解惑
```

**两条线，别混为一谈：**

- **线上站点是纯前端静态站**（`public/`，零 CDN、零 Signup），取 `./data/index.json`，
  审定在浏览器里跑（`spirits.js` / `furnace.js` / `ask.js` / `ingest.js`）。
- **但仓库带构建与部署管道**：`scripts/refine.py` 是真正的炼化炉（LLM 引擎出金丹，
  `cmd_build` 产出 `public/data/index.json` 与技能文件），`scripts/deploy.py` 负责上线，
  `package.json` 提供 `build / serve / deploy`。

**规范数据不是单文件**：源头是 `data/chapters/001~081.json`（每章 `refined.{danzi,danjue,benyi,…}`），
聚合为 `data/index.json`，`public/data/index.json` 只是**构建产物**。

## 二、目标（为何做）

1. **让每一章有根有据地成丹**——每一颗金丹都要扣得住所引的原文，经得起追问"这一句原文在哪"。
2. **让人找得到答案在哪几章**——不是替人想好答案，而是指出《道德经》里哪几章在回答他。
3. **让这座炉子自己能传下去**——换一个 Agent、换一台机器接手，照这套规矩重建得出来（本协议：MRS-EV v1.1）。

## 三、原则（长期有效 · 炉子的业务本性）

治理层已交由**八原则**（见第七节），此处只写这座炉子之所以是它的那几条：

1. **无根不结丹。** 输出必须落到具体章号，`matchChapters` 为空则一律否丹——火再旺也不成。
2. **不编造。** 没有金丹就说没有，检索不到就说检索不到。主题降级必须写明「权作参证」，绝不冒充正答。
3. **原文不可改。** `chapters[].original` 与 `detail.*` 里的字，只有人能动；脚本只提候选，从不自动落笔。
4. **金丹分深浅。** `refined` / `pending` 是两个面容：已炼者出全丹，未炼者只给老子自己的话。不许抹平。
5. **料只清理，不改写。** `INGEST` 只剥时间轴、压空白；不润色、不补全、不替料说话。
6. **降级必如实。** CORS 抓不到就说抓不到，音视频浏览器炼不了就照直说。不伪装成功——**非恒道**。

## 四、边界（不做什么）

- **不替人做决定。** 炉子指出哪几章在回答他，结论他自己下。
- **不给处方。** 三维里的「健康养生」是义理启迪，不是医疗意见；涉具体病症一律劝其就医。
- **不改经文一字。** 断句、异文争议写进 `benyi` 里当议题，不动 `original`。
- **不经手真值。** 课程视频本体、存储桶凭证、转写服务密钥一概不入库、不落盘、不进聊天记录。
- **不为凑数炼丹。** 76 章未炼就摆着 76 章未炼，不用浅薄释义填满空格。
- **不用 LLM 兜底编造。** 需要深度释义时，产出的是**候选草稿**，人勾选后才进 `detail`。

## 五、核心约定（点内三性）

| 符号 | 文件 | 本体内涵 |
|------|------|----------|
| M | `Memory.md` | 身份、目标、原则、边界（阴鱼主体）——本文件 |
| R | `Readme.md` | 读取/写入协议、凭证引用表（S 曲线协议） |
| S | `State.md`  | 当前进度、阻塞、下一步（阴中阳点） |
| J | `Journal.md` | 经验流水，**半内核**：只追加，不参与日常决策，只在蒸馏时被翻出来 |

## 六、本炉的点圆映射

| 符 | 在本炉是什么 | 能否重建 |
|---|---|---|
| **M** | 上述四问＋炼化规矩本身（四判据阈值与「无根不结丹」底线写在此处） | 否 |
| **R** | 读写协议、取数通道、凭证引用表（详见 `Readme.md`） | 否 |
| **S** | 炼到第几章、卡在哪 | 否 |
| **J** | 为什么否丹、为什么重炼 | 否（只追加） |
| **E1** | `public/` 下的页面与脚本、`assets/media/`、`TOOLS.md`、`repos.md`、`scripts/` | 是 |
| **E2** | `.env.example`（只写键名） | 是 |
| **E3** | `secrets/README.md`（只写如何取） | 是 |
| **Vault** | 课程音视频本体、存储桶凭证、转写密钥——**永在体系之外** | — |

**怎么判是内核，怎么判是外延**（这一刀决定所有写入规则）：
`data/chapters/*.json` 的 `original/title/themes` 与 `refined.benyi/yinshen/wei` 是**内核**
`ferocity` 是判据的输出快照，属于**外延**（改判据即可重算）；
`danzi/danjue` 与 detail 双写，属**半内核**——只提差异，不自动回写。

> **规矩是点，规矩算出来几分是圆。**

## 七、八原则（治理层，不可轻易更改）

1. 内核不轻动　2. 协议先行　3. 状态必更新　4. 外延可插拔
5. 虚实分离　6. 真值入 Vault　7. 最小权限　8. 泄露即轮换
```

### ● R —— 怎么协作　`Readme.md`

```markdown
# ● Readme.md —— 协议（S 曲线 / 点内三性之一）

> **协议先行：必须先读。** 回答「怎么读？怎么写？怎么协作？」
>
> 接手这个项目的第一站。读完这一份，再决定动哪里。

## 一、读取顺序（启动闭环）

```
Readme.md（本文件） → Memory.md（我是谁/不做什么） → State.md（现在在哪、卡在哪）
        → 按需 ○E1：TOOLS.md / repos.md / *.js / assets/media/
        → 按需 ○E2：.env.example（键名）
        → 按需 ○E3_ref：secrets/README.md（只写"如何取"）
```

顺序不许跳：`distill.py` 会从这份文件里抽出 `## 三` 的凭证引用表塞进交接包，写错了包就是错的。

## 二、跑起来（唯一正确的打开方式）

```bash
cd daodejing
python3 -m http.server 8080 --directory public   # ＝ npm run serve
# 打开 http://localhost:8080/
```

⚠️ **站点目录是 `public/`，不是仓库根目录**——服务必须指向 `public/`，
否则打开的是仓库根，`./data/index.json` 取不到东西。

⚠️ **不能用 `file://` 直接双击打开。**
站点靠 `fetch('./data/index.json')` 取数——浏览器不给 file 协议读本地文件，
结果是八十一章全空。**这不是 bug，是浏览器的规矩。**

改了 `data/chapters/` 之后要重建：
```bash
python3 scripts/refine.py build    # ＝ npm run build；重建索引与技能文件
```

页面：`/`（问道）· `/refine.html`（炼丹）· `/vault.html`（藏丹阁）· `/ask.html`（细问与浏览）· `/model.html`（模型）

## 三、凭证引用表（E3_ref —— 只引用，不写值）

<!-- 真值一律不放这里。看到引用名，去 Vault 取，不要向人要明文。 -->

| 引用名 | 用途 | Vault 路径（如何取） |
|--------|------|---------------------|
| `E3_MEDIA_BUCKET` | 课程音视频原件的存储位置 | `daodejing/media_bucket`（项目网盘／对象存储，凭证由持有人保管） |
| `E3_TRANSCRIBE_API_KEY` | 视频转写服务密钥（本地 whisper 时不需要） | `daodejing/transcribe_api_key` |
| `E3_DEPLOY_TOKEN` | 重新发布上线时的令牌 | `daodejing/deploy_token` |

当前状态：**此三项均为"尚未取用"**——本项目眼下没有任何凭证是被明文持有的，
这是刻意的（最小权限）。要用的时候才去 Vault 取，用后即弃，不落盘。

## 四、写入规则（更新闭环）

| 什么变了 | 写到哪 | 谁能写 |
|----------|--------|--------|
| 炼成／改了一章金丹 | **规范源** `data/chapters/<NNN>.json` 的 `refined` ＋ `State.md` 进度；随后 `refine.py build` 重建 `data/index.json` 与 `public/data/index.json` | 人拍板后才落 |
| 任务进度、卡点 | `State.md` | 每次都写，**不可留空** |
| 炼化中的经验教训 | `Journal.md`（只追加） | 随时追加，永不删改 |
| → 攒一批后提炼成原则 | `CANDIDATES.md` → `Memory.md`「熏修所得」 | 脚本提名，**人勾选** |
| 页面 / 脚本 / 工具 | `public/*.js` `public/*.html` `assets/media/` `scripts/` | 随便重写（E1） |
| 某种证明文件位置、账号钥匙 | **Vault，不进本目录** | 持有人 |

**禁止的事**：手改 `has_media`（由 `scripts/sync_media.py` 单向回写）；
手改 `public/data/index.json`（它是 `refine.py build` 的产物，改了会被下次构建冲掉，
要改就改 `data/chapters/`）；
手改 `refined`／`original` 以求"看起来更好"；手抄 `HANDOFF.md`（必须生成）。

## 五、数据源怎么定性（决定了谁能动它）

**规范源是 `data/chapters/001~081.json`**（每章一份），`data/index.json` 是它的聚合，
`public/data/index.json` 是构建产物。这一串不是铁板一块，按能否重建切开：

| 段 | 位置 | 定性 | 谁可写 |
|---|---|---|---|
| `id/title/original/themes/keywords` | `data/chapters/*.json` | **内核** | 人 |
| `refined.benyi/yinshen/wei` | `data/chapters/*.json` | **内核** | 人 |
| `refined.danzi/danjue`（与聚合的 `detail` 双写） | 同上 | 半内核 | 脚本只报差异，**不自动改** |
| `ferocity`（81 章全有） | 同上 | **外延**：判据的输出快照 | 重算即可 |
| `total/refined/updated` | `data/index.json` | **外延**：统计 | `refine.py build` |
| `has_media` | `data/index.json` | **外延**：开关 | `sync_media.py` |
| `public/data/index.json` 全篇 | `public/data/` | **构建产物** | `refine.py build`，**勿手改** |

一句话：**怎么判是内核，判出来几分是圆。**

## 六、三条硬规矩

1. **交接包必须生成，不能手写。** 手写的必过期；过期的交接包比没有更危险——它让接手方**以为自己懂了**。
   ```bash
   python3 scripts/handoff.py .
   ```
2. **交接必须自带验收。** 接手方要能回答四问：是什么／卡在哪／下一步／不能碰什么。
   答不上就**回问，不许猜**。
3. **脚本只提候选，绝不自动改内核。** `Journal → CANDIDATES →（人勾选）→ Memory`。
   **相可以自动，君不可以。**

## 七、八原则

1. 内核不轻动　2. 协议先行　3. 状态必更新　4. 外延可插拔
5. 虚实分离　6. 真值入 Vault　7. 最小权限　8. 泄露即轮换
```

### ● S —— 现在在哪　`State.md`

```markdown
# ● State.md —— 状态（阴中阳点 / 点内三性之一）

> 连接态：回答「现在在哪？卡在哪？下一步？」**状态必更新。**
> 这份文件的有效期到下一个动它的人为止。别指望它自动保鲜。

## 当前目标

把这座《道德经》炼化炉接入 **MRS-EV 太极·点圆统一模型 v1.1**：
让它说得清自己（有个模型页）、交得出去（`HANDOFF.md` 随时可生成）、
并且**能把课程里那批文字稿和视频真正炼进去**——这是我们最后那句「更好的炼化」的落点。

## 仓库真实结构（写状态前先认清，别照着错的印象干活）

**规范数据 → 构建 → 部署，是三段，不是一坨：**

| 位置 | 角色 | 能否重建 |
|---|---|---|
| `data/chapters/001~081.json` | **规范源**：每章原文与 `refined.{danzi,danjue,benyi,…}` | 内核，不可重建 |
| `data/index.json` | 聚合索引（`chapters[]` + `detail{}`） | 混血 |
| `public/data/index.json` | **部署副本，由 `refine.py build` 自动生成** | ○ 可重建，勿手改 |
| `public/*.html`、`public/*.js` | 静态站点（Vercel `outputDirectory`） | ○ 可重建 |
| `scripts/refine.py` | 真·炼化管道：LLM 引擎出丹 + `cmd_build` 产索引 | ○ 可重建 |
| `scripts/deploy.py`、`package.json` | 部署与 `build/serve/deploy` | ○ 可重建 |

**站点文件在 `public/`，不在仓库根目录。** 手改部署副本会被下次 `build` 冲掉；
要改数据就改 `data/chapters/`，再 `python3 scripts/refine.py build`。

## 进度

**已落（接手这一轮 · 已并入 `batcatchina/daodejing`）**

- [x] 定位原仓库 `github.com/batcatchina/daodejing`（账号 `batcatchina`，默认分支 `main`）
- [x] 铺 MRS-EV 内核三件套与外延：`Memory` / `Readme` / `State` / `Journal` / `TOOLS` / `repos`
- [x] 调入 `scripts/handoff.py`（交接包必须脚本生成）、`scripts/distill.py`（经验蒸馏）
- [x] 媒体槽位 `assets/media/` ＋ `manifest.json` ＋ `scripts/sync_media.py`（单向回写 `has_media`）
- [x] 新增 `public/model.html`：太极图讲清点圆本体映射与生长循环，并挂上第四签「模型」
- [x] 生成本轮 `HANDOFF.md`（脚本产物，非手写）

**未落（下一轮的事）**

- [ ] **课程资产入库：0 / 81 章有稿**（`manifest.json` 还是空的，`has_media` 全 false）
- [ ] **76 章金丹待炼**（现成 5 章：1 / 8 / 11 / 25 / 64）
- [ ] `detail.*.sources[]` 五处空数组未补出处
- [ ] 浏览器侧三处改进已识别、尚未并入（详见下方「待并入」）

**待并入：浏览器侧三处改进（本次刻意没动 `public/` 现有脚本）**

这一轮为不破坏现有 `refine.py` 构建管道与线上站点，只做增量，**没有覆盖**
`public/` 下任何现有脚本。以下三点是先前在离线版本上验证过的真实缺陷与修法，
留待下一轮与仓库现有版本逐处 diff 后并入：

1. `ingest.js` 未剥「行首时间码」（`00:00:03 文本`）——whisper 导出与人工听写稿
   最常见的一式，原样整份带码入炉。
2. `furnace.js` / `pickChapter` 未按证据强度取章——会「引 A 章之文、却取 B 章之丹」。
   （`refine.py` 侧 `cmd_assay` 是否同病，需一并核对。）
3. 答面渲染与 `$ / esc / md` 在首页与问道页各有一份，可抽共用层。

## 阻塞

**① 课程资产还没有清单，这是眼下真正卡住的事。**
我知道课程「有文字也有视频」，但不知道：哪几段对应哪一章、文件名叫什么、多长、
能不能公开。少了这一段，炼化就开不了工——投错了料，炼出来的是别人的丹。
在清单到位之前，`sync_media.py` 无米下锅，炼化线只能炼「人手工贴进来的一段文字」。

**② 76 章的炼化没有排期，也没有批量与否的授权。**
红线已经画好（脚本只出候选草稿，人勾选后才入库），但「要不要 AI 批量起草」这件事必须人来定：
我不替这个人拍这一下——这是 Memory 里「不为凑数炼丹」那一条的本意。

**③ `updated` 时间戳没有时区信息**（现为「2026-09-15 20:30」）。要不要统一改成 ISO8601 待定，
没定之前不擅自改数据格式。

## 下一步

1. **交一份课程清单**：章节号 / 文件名 / 时长 / 许可状态。有了它，跑通
   `manifest.json → sync_media.py --apply → refine.html?src=` 这一条，先把**第一章**确确实实炼一颗出来，
   把整条链路跑通再谈批量。
2. **人拍板先炼哪一批**：建议从第 8 章（上善若水）入手——它被语义桥引用最多，
   一颗顶好几颗。
3. **逐处 diff 后并入浏览器侧三处改进**（上文「待并入」），并入前先确认
   `public/` 现有版本是否已有更新内容，避免覆盖。
4. **重新发布上线**（Vercel 会随 push 自动部署；但「发布」这件事我等你点头，不擅自触发。）

## 运行位置提示

- 启动顺序：`Readme → Memory → State`。
- 本地看站点：`python3 -m http.server 8080 --directory public`（或 `npm run serve`），
  不能 `file://` 直开（详见 Readme 第二节）。
- 改了 `data/chapters/` 之后：`python3 scripts/refine.py build`（重建索引与技能文件）。
- 交接前自检：`python3 scripts/handoff.py .`
- 媒体链路：先 `python3 scripts/sync_media.py`（看差异），确认后加 `--apply`。
- 真值（E3）按需从 Vault 注入（见 Readme 凭证引用表），**不写进这些文件**。
```

---

## 2. 外延 ○（只需知道存在，不必搬运）

### ○ E1 公开

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

# ○ repos.md —— 公开外延 E1（仓库清单）

> 可直接读。有哪些仓库？用途？远程地址？

## 一、本项目仓库

| 仓库名 | 用途 | 远程地址 |
|--------|------|----------|
| `daodejing`（本地工作副本） | 《道德经》AI 智能炼化炉：静态站 + 八十一章数据 + 模型体系 | **尚未建立 git 仓库** —— 见 State.md 未落项 |

现网：https://daodejing.zheng-he.top （当前跑的还是接手前的旧版本，新版待确认后再发布）

> 建立 git 之前请注意 `.gitignore` 已经预置：`.env`、`secrets/*`、音视频本体、
> `CANDIDATES.md` 与 `*.bak` 都不入库。**别嫌它啰嗦**——凭证永远不进这个仓库。

## 二、外部参考资源（非代码仓库）

| 资源 | 用在哪 |
|---|---|
| https://taiji.zheng-he.top | MRS-EV 太极·点圆统一模型 v1.1，本项目的体系来源（含 `handoff.py` / `distill.py` 原型） |
| https://daodejing.zheng-he.top | 本项目现网版本（接手对象） |
| 《道德经》王弼本 / 帛书本 | 经文底本，`data/index.json` 的 `original` 与 `benyi` 里标注的异文争议来源 |

## 三、添加新仓库的约定

- 公开仓库：直接在此追加（E1）。
- 含机密配置的：配置写 `.env.example`（E2），真值走 Vault（E3）。
- 变更后**回填 State.md 的「进度」**（状态必更新）。

### ○ E2 配置（**只列键名，不给值**）

- `VERCEL_TOKEN`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `E3_MEDIA_BUCKET`
- `E3_TRANSCRIBE_API_KEY`
- `E3_DEPLOY_TOKEN`

### ○ E3 凭证（**只列引用名，真值在 Vault**）

| 引用名 | 说明 |
|---|---|
| `E3_DEPLOY_TOKEN` | 见源项目 Readme.md 凭证引用表 |
| `E3_MEDIA_BUCKET` | 见源项目 Readme.md 凭证引用表 |
| `E3_TRANSCRIBE_API_KEY` | 见源项目 Readme.md 凭证引用表 |

> ⚠️ 本包**不含任何真值**。看到 `E3_*` 请去 Vault 取，不要问导出者要明文。

---

## 3. 未决与阻塞

### 阻塞（当前卡住的事）

**① 课程资产还没有清单，这是眼下真正卡住的事。**
我知道课程「有文字也有视频」，但不知道：哪几段对应哪一章、文件名叫什么、多长、
能不能公开。少了这一段，炼化就开不了工——投错了料，炼出来的是别人的丹。
在清单到位之前，`sync_media.py` 无米下锅，炼化线只能炼「人手工贴进来的一段文字」。

**② 76 章的炼化没有排期，也没有批量与否的授权。**
红线已经画好（脚本只出候选草稿，人勾选后才入库），但「要不要 AI 批量起草」这件事必须人来定：
我不替这个人拍这一下——这是 Memory 里「不为凑数炼丹」那一条的本意。

**③ `updated` 时间戳没有时区信息**（现为「2026-09-15 20:30」）。要不要统一改成 ISO8601 待定，
没定之前不擅自改数据格式。

### 下一步（紧接着要做的动作）

1. **交一份课程清单**：章节号 / 文件名 / 时长 / 许可状态。有了它，跑通
   `manifest.json → sync_media.py --apply → refine.html?src=` 这一条，先把**第一章**确确实实炼一颗出来，
   把整条链路跑通再谈批量。
2. **人拍板先炼哪一批**：建议从第 8 章（上善若水）入手——它被语义桥引用最多，
   一颗顶好几颗。
3. **逐处 diff 后并入浏览器侧三处改进**（上文「待并入」），并入前先确认
   `public/` 现有版本是否已有更新内容，避免覆盖。
4. **重新发布上线**（Vercel 会随 push 自动部署；但「发布」这件事我等你点头，不擅自触发。）

---

## 4. 接手校验（必做）

**读完本包后，你必须能回答这四个问题。任何一个答不上——回问导出者，不许猜，不许动手。**

| # | 问题 | 答不上怎么办 |
|---|---|---|
| 1 | 这个项目是什么？为谁做？ | 重读第 1 节 M |
| 2 | 现在做到哪了？卡在哪？ | 快照过期 → 回问导出者 |
| 3 | 下一步具体做什么？（1–3 个动作） | 同上 |
| 4 | 我绝对不能碰什么？ | **禁止动手**，先问清边界 |

**校验通过后，第一件事**：更新 `State.md` 的「下一步」，让下一个人知道你接住了。

---

> 本文件由 `scripts/handoff.py` 生成。手写必过期。规范见 `docs/交接协议.md`。
