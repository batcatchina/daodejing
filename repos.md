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
