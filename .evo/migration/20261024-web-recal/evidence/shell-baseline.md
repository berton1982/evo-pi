# shell 保真基线（逐项清单）

> 快照：`harness/snapshot/fidelity/shell.{piweb,evopi}.json`（采集 2026-10-24T01:46:01.565Z）
> 由 `harness/baseline.mjs` 生成，**状态列由人改，其余数字全部来自快照**。
> 复算：`node .evo/migration/20261024-web-recal/harness/baseline.mjs --flow shell`

## 总量

| 口径 | 数 |
|---|---|
| pi-web 可见元素 | 44 |
| evo-pi 可见元素 | 29 |
| 已对齐 | 20 |
| **覆盖率** | **45.5%** |
| 只有 pi-web 有 | 24 |
| 只有 evo-pi 有（信息融合/多出来的，需要人工判断） | 9 |

## 逐项清单（只有 pi-web 有的）

| # | 缺口组 | 元素 | 区域 | 快捷键 | 状态 | 处置依据 |
|---|---|---|---|---|---|---|
| 1 | 会话区 | `group:新会话的位置` | 主区 | — | 差异 | pi-web 用 role=group 包住底部按钮组；我们用 shell/layout 的 toolbar 区域，语义等价 |
| 2 | 文件区 | `button:文件` | 区域 | — | 差异 | pi-web 侧栏页签是 button，我们用 role=tab + tablist（更好的读屏语义，见 sidebar-tabs.tsx） |
| 3 | 文件区 | `button:搜索文件` | 区域 | — | 差异 | pi-web 是"点按钮才出搜索框"，我们的搜索框常驻（files-toolbar.tsx data-testid=files-search） |
| 4 | 顶栏与区域语义 | `button:pi-web` | 区域 | — | 差异 | pi-web 顶栏外链自家文档站，evo-pi 不提供该站点，不做 |
| 5 | 顶栏与区域语义 | `button:openwiki` | 区域 | — | 差异 | 同上：文档站外链，非壳职责 |
| 6 | 顶栏与区域语义 | `button:已归档 · 7` | 区域 | — | blocked | 属 C-C 会话面板工具条（归档/历史），需该能力立项 |
| 7 | 顶栏与区域语义 | `button:受限模式` | 顶栏 | — | blocked | 属 C-C 会话面板工具条（受限模式开关） |
| 8 | 顶栏与区域语义 | `button:完整历史` | 顶栏 | — | blocked | 属 C-C 会话面板工具条（完整历史视图） |
| 9 | 顶栏与区域语义 | `button:生成标题` | 顶栏 | — | blocked | 属 C-C 会话面板工具条（生成会话标题） |
| 10 | 顶栏与区域语义 | `button:系统提示词` | 顶栏 | — | blocked | 属 C-C 会话面板工具条（编辑系统提示词） |
| 11 | 顶栏与区域语义 | `button:工具定义` | 顶栏 | — | blocked | 属 C-C 会话面板工具条（工具定义查看） |
| 12 | 顶栏与区域语义 | `button:发送` | 右栏 | — | blocked | 消息发送入口属 C-C 会话面板，壳不代劳 |
| 13 | 顶栏与区域语义 | `button:MiniMax-M3.1-Flash` | 主区 | — | blocked | 模型选择属 C-C 会话面板工具条 |
| 14 | 顶栏与区域语义 | `button:更改推理级别` | 右栏 | — | blocked | 推理级别属 C-C 会话面板工具条 |
| 15 | 顶栏与区域语义 | `button:更改工具预设` | 右栏 | — | blocked | 工具预设属 C-C 会话面板工具条 |
| 16 | 顶栏与区域语义 | `button:压缩上下文` | 右栏 | — | blocked | 上下文压缩属 C-C 会话面板工具条 |
| 17 | 顶栏与区域语义 | `button:关闭完成提示音` | 右栏 | — | blocked | 完成提示音属 C-C 会话面板工具条 |
| 18 | 项目选择器 | `button:Pi Web，版本：web 0.12.2，pi 1.2.0` | 顶栏 | — | 差异 | pi-web 把版本融进项目按钮名；我们把版本拆成独立 sr-only 节点（project-picker.tsx project-version，P7 信息融合规矩） |
| 19 | 项目选择器 | `button:parity-proj` | 区域 | — | 差异 | pi-web 列"最近 cwd 历史"，我们列 trust.json 项目清单；夹具目录名不同不算缺口 |
| 20 | 项目选择器 | `button:cwd2` | 区域 | — | 差异 | 同上（pi-web 夹具里的历史 cwd） |
| 21 | 项目选择器 | `button:cwd` | 区域 | — | 差异 | 同上（pi-web 夹具里的历史 cwd） |
| 22 | 项目选择器 | `button:evo-pi` | 区域 | — | 差异 | 同上：按 trust.json 列项目，当前夹具以 parity-proj 呈现 |
| 23 | 项目选择器 | `button:打开其他项目…` | 区域 | — | blocked | 我们的入口在项目面板内（点开才可见，project-picker.tsx:102），pi-web 常驻底栏；面板化是交互形态差异，需人工确认是否改成常驻 |
| 24 | 项目选择器 | `button:/tmp/parity-proj` | 区域 | — | 差异 | pi-web 显示绝对路径，我们显示项目名 + 复制路径按钮 |

## 只有 evo-pi 有（多出来的）

| # | 元素 | 区域 | 人工判断 |
|---|---|---|---|
| 1 | `button:.parity-proj` | sidebar-header | |
| 2 | `tablist:会话文件` | sidebar-header | |
| 3 | `tab:会话` | sidebar-tabs | |
| 4 | `tab:文件` | sidebar-tabs | |
| 5 | `button:在以下项目新建会话： .parity-proj` | sidebar-header | |
| 6 | `input:搜索文件` | files-toolbar | |
| 7 | `tree:/home/berton/evo-pi/.parity-proj` | files-tab | |
| 8 | `banner:顶栏` | center | |
| 9 | `separator:调整右侧面板宽度` | 顶栏 | |

## 分组小计

| 缺口组 | 条数 | 已完成 |
|---|---|---|
| 会话区 | 1 | 0 |
| 文件区 | 2 | 0 |
| 顶栏与区域语义 | 14 | 0 |
| 项目选择器 | 7 | 0 |

## 规矩

1. **状态只由人改**：`todo` → `done` 必须同时留 `处置依据`（`文件:行` 或 e2e 用例名），否则下次复算仍是 todo。
2. **多出来的元素先当缺口看**：可能是信息融合（一个节点塞两个概念），要填 `## 信息融合` 说明。
3. **覆盖率降不算退步**：pi-web 侧新增元素会让分母变大，报告里要写清"分母变了"。
