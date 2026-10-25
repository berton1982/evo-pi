# 复盘：C-C 会话面迁移

## 一、设计与实施的偏差（哪些判断被现实推翻）

| 原设计判断 | 实际情况 | 代价 |
| --- | --- | --- |
| 前端只放展示，业务规则留在 core | 我第一次把 `domain/`+`use-cases/` 一起搬进 `packages/web/src/features/chat`，用户指出违反 `ADR-0001` 后全部搬回 `core/src/chat` | 一天往返 + `runtimeFit`/`placement` 两道门补齐（G-29/G-30） |
| `ui.md` 画一张主屏原型就够 | 用户两次指出缺控件：① 输入区工具条形态（模型/推理/预设全在「更多控件」折叠面板）② 顶栏分工（新建在左区、主区顶栏是信任/历史/标题/分支/系统/工具 + 右侧会话信息） | 行为 46 → 57 条，新增三道门（`renderBoundary` / `readlogCoverage` / `uiProto:inventory`） |
| 手写 markdown 解析器够用 | 表格/列表/行内代码全被当纯文本，与 pi-web 差距明显 | 换 `react-markdown`+`remark-gfm`+`rehype-sanitize`（与 pi-web 同栈），排版从 `globals.css:1119` 逐条移植 |
| e2e 用 testid 断言即可 | 运行态用例依赖构建期常量与 agentDir，漏配就全红 | 新增 `e2e/serve.sh`，把"环境即前置条件"固化 |

## 二、门的表现（哪些门抓到了真问题）

| 门 | 抓到的真问题 |
| --- | --- |
| `externalIo` | `ChatWindow.tsx` 自身只有 1 个 `fetch`，沿 import 追出 **5 个模块 / 11 条命令**；不追就会"分母为零→永远达标" |
| `trace` | 两个 bug：ID 正则无词边界（`ST-01` 里的 `T-01` 被当元素）、`designIds` 只认 `elements`（组件/hook/store 被当"不存在的元素"） |
| `lines landed` | 发现 `mcp-status-row.tsx` 被当死代码误删（它是 `D-U-08` 的落点） |
| `observations` | 16 个界面任务必须在**实施前**写观察；写的过程中发现 pi-web 的滚动容器只有一处（`ChatWindow.tsx:1089`） |
| `runtimeFit` | 把"这段代码该跑在浏览器还是服务端"变成判据，直接拦住了我第二次搬错 |
| `uiProto:inventory` | 顶栏 6 个入口 + 输入区 10 个控件，靠"区域→入口清单 ↔ 原型"双向对账才暴露少画 |

门没抓到的（靠人）：控件是否画全、布局是否与源产品一致、样式尺度是否正确——`uiProto`/`fidelity` 的 `cannotCatch` 已按此修正。

## 三、遗留（不阻塞结项，已登记）

1. **G-34**：`fidelity` 的"逐条点名"与 `parity.md` 的 120 行预算互斥（详见 `.evo/migration/README.md`）。
2. 保真快照对会话面需要"按消息内容对齐"（已实现 `alignBlocks`），但shell 侧仍是 DOM 序号口径。
3. 滚动几何 3 条 e2e 仍 `fixme`：壳的 `center-zone` 高度链属 C-B。
4. 扩展 UI 宿主 617 行按 CHG-004 砍单。

## 教训与落地

| 教训 | 落地 |
| --- | --- |
| 门要能表达"分母不存在"：`externalIo` 因"文件里没有 fetch"被当成"没有契约要对账"而生 | 已进技能（C2 的 `externalIo` 门 + `lib/external.mjs`），后续能力自动继承 |
| 环境即前置条件：构建期常量、agentDir、视口漏配会让"绿"变假绿 | 新增 `e2e/serve.sh`（构建期带 `NEXT_PUBLIC_E2E_FAKE_TRANSPORT=1`、运行期默认 `/tmp/e2e-agent`） |
| 样式对齐是独立工作：语义搬来 ≠ 观感一致 | 已固化为 `T-21…T-24` 四步（排版/代码块/行宽/间距），并写进本能力 `plans/C-C.md` 作为后续界面能力的模板动作 |
| 文档与门的预算要一起设计：门要求逐条、预算要求精简 | 记为 **G-34**（`.evo/migration/README.md`），在门改造前不再往 `parity.md` 灌明细 |
| 能力边界要同时定义"代码行归属"和"屏幕区域归属" | 新增 `renderBoundary`（C0）/`readlogCoverage`（C3）/`uiProto:inventory`（C4）三道门 |
