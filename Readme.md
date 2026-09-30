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
