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
