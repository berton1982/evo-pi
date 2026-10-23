// ★ 阶段契约的单一事实来源。
//
// 为什么必须只有一份：上一代技能把「后端 6 门 + 前端 8 门」写在 4 个文件里，
// 而脚本实现是 B0-B6 + F1-F9（16 个），文档与实现各自漂移。
// 这里把作用域、阶段、子步骤、输入、产出、退出条件全部收敛到一个数组，
// state.mjs / check-phase.mjs / design-gate.mjs / 人读的 workflow.md 都从它派生。
//
// 四层作用域（每次迁移各建一个 run）：
//   program    一次：纲领 → 契约 → 骨架 → 全局架构 → 切片 → 割接预案
//   chassis    一次：底盘契约 → 布局 → 应用框架 → 验收
//   capability 每个能力一次：立项 → 读全 → 契约对齐 → 行为 → 设计 → 实现 → 对账 → 收割
//   cutover    一次：预演 → 割接 → 复盘
//
// R 级裁剪：capability 阶段的门带 levels，R1 能力跳过高成本产物（如完整决策表/时序图）。
//
// 退出条件（checks）只是机器能证伪的那部分；判断类工作写进 substeps。

export const SKILL_NAME = 'migrating-god-files'
export const SKILL_VERSION = 3

// 运行期输入：不是任何阶段的产出，必须由外部提供。
export const RUN_INPUTS = {
  godRegistry: {
    path: '.evo/migration/GODS.md',
    why: 'god 全景表。不先读它 = 不知道自己在哪、依赖方是谁、状态是否已过期',
  },
  archRules: {
    path: 'arch/rules.json',
    why: '全局架构规则（层序/禁止边/机制枚举/质量上限）。能力设计必须与它一致',
  },
}

export const SCOPES = ['program', 'chassis', 'capability', 'cutover']

// 每个作用域的阶段顺序（advance 依赖它）
export const SCOPE_PHASES = {
  program: ['P0', 'P1', 'P2', 'P2.5', 'P3', 'P4'],
  chassis: ['H0', 'H1', 'H2', 'H3'],
  capability: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
  cutover: ['X0', 'X1', 'X2'],
}

export const LEVELS = ['R1', 'R2', 'R3']

export const PHASES = [
  // ═══════════════════════ Program ═══════════════════════
  {
    id: 'P0',
    scope: 'program',
    name: '纲领与分级',
    goal: '把「迁什么、到什么程度算完、哪个 god 有多危险」变成可复现的事实',
    consumes: ['godRegistry', 'docs/adr/*', 'ref_projects/pi-web 源码'],
    produces: ['PROGRAM.md', 'GODS.md（补 R 级列）'],
    substeps: [
      { id: 'p0.1', task: '扫描 >1000 行的生产文件，与 GODS.md 对账（清单必须封闭）' },
      { id: 'p0.2', task: '给每个 god 定 R 级：R3 中枢 / R2 复杂界面+数据 / R1 独立模块' },
      { id: 'p0.3', task: '写成功定义与**不做清单**（不做清单比做清单更能防漂移）' },
      { id: 'p0.4', task: '容量假设：人周 × 里程碑，并写明「偏差 >30% 就重排」' },
      { id: 'p0.5', task: '逐条送签' },
    ],
    checks: [
      { kind: 'file', path: 'PROGRAM.md', minBytes: 400 },
      { kind: 'heading', path: 'PROGRAM.md', text: '## 1. 成功定义' },
      { kind: 'heading', path: 'PROGRAM.md', text: '## 2. 不做清单' },
      { kind: 'heading', path: 'PROGRAM.md', text: '## 3. 容量假设' },
      { kind: 'godRegistryClosed' },
      { kind: 'godsHaveR' },
    ],
  },
  {
    id: 'P1',
    scope: 'program',
    name: '契约冻结',
    goal: '把「对外承诺」一次性冻结：wire / 数据格式 / 路由 / i18n / 设计系统 / 交互',
    consumes: ['GODS.md', 'pi-web 冻结快照（sha1）', 'OpenWiki（drift 校验）'],
    produces: [
      'contracts/{wire,data-format,routes,i18n,design-system,interaction}.md',
      'contracts/schema.ts',
      'fixtures/',
      'harness/',
      'contracts/stubs.md（前后端独立开发用的桩清单）',
      'environment.md（端口/变量/构建/版本/夹具）',
    ],
    substeps: [
      { id: 'p1.1', task: '抽 wire 契约：命令 / 事件 / 错误码，每条带 path:line' },
      { id: 'p1.2', task: '抽数据格式：session JSONL 字段与兼容规则，用真实样本做 fixture' },
      { id: 'p1.3', task: '抽路由契约：深链矩阵（哪些参数、刷新/后退/分享行为）' },
      { id: 'p1.4', task: '抽 i18n 与设计系统：命名空间 + token 命名（不逐个 token 化）' },
      { id: 'p1.5', task: '抽交互契约：快捷键、焦点顺序、通知与失效语义' },
      { id: 'p1.6', task: '搭 harness：capture(30141) / assert(30041) 两侧 + 归一化规则' },
      { id: 'p1.7', task: '双读验证：同一 fixture 被 pi-web 与 evo-pi 都解析成功' },
      {
        id: 'p1.8',
        task: '写桩清单 contracts/stubs.md：每条契约命令/事件一行，桩实现路径 + 夹具路径 + 状态（ready / blocked+理由）',
      },
    ],
    checks: [
      { kind: 'contracts', dir: 'contracts' },
      { kind: 'file', path: 'contracts/schema.ts', minBytes: 80 },
      { kind: 'harness', dir: 'harness' },
      { kind: 'stubPlan' },
      { kind: 'envReady' },
      { kind: 'fixtures', dir: 'fixtures' },
      { kind: 'heading', path: 'contracts/wire.md', text: '## 命令' },
      { kind: 'heading', path: 'contracts/wire.md', text: '## 事件' },
      { kind: 'wireTable' },
    ],
  },
  {
    id: 'P2',
    scope: 'program',
    name: '骨架贯通',
    // 只要求"最小路径"而非"全链路"：发送/流式/落盘/URL 同步是各能力 C5 的实现内容，
    // 若在 P2 就要求通电，阶段顺序会自相矛盾（P2 早于任何能力）——真实测试中撞到过。
    goal: '一条最小路径通电：列表 → 读单会话上下文 → 错误码分支（发送/流式/落盘/URL 同步留给能力 C5）',
    consumes: ['P1 全部契约', '现有 packages/core 读侧'],
    produces: ['可运行代码', 'harness/report/skeleton.md', 'gates/P2.json（真实 smoke 证据）'],
    substeps: [
      {
        id: 'p2.1',
        task: '接线四层：route → use-case → port → adapter（端口注入，不在 route 顶层做 composition root）',
      },
      { id: 'p2.2', task: '打通读侧真路径（复用既有 read-side）' },
      { id: 'p2.3', task: '打通写侧与流式（单一入口 + 唯一 reducer）' },
      { id: 'p2.4', task: '接 harness：实跑一遍并出报告' },
      {
        id: 'p2.6',
        task: '记证据：record-verification --id P2 --cmd "<贯通路径的 smoke 命令>"（覆盖 HTTP→use-case→adapter；纯 node --check 不算）',
      },
      { id: 'p2.5', task: '浏览器亲验（用户）：截图 + 交互走一遍' },
    ],
    checks: [
      { kind: 'file', path: 'harness/report/skeleton.md', minBytes: 200 },
      { kind: 'heading', path: 'harness/report/skeleton.md', text: '## 硬门' },
      { kind: 'sectionClean', path: 'harness/report/skeleton.md', section: '## 硬门' },
      { kind: 'heading', path: 'harness/report/skeleton.md', text: '## 走通的路径' },
      // 报告是自己写的，写「未贯通」也能过门——试运行时就是这么过的。
      // 真判据只能是「有命令跑过且 exit 0」：gates/P2.json 由 record-verification 生成。
      { kind: 'verification', id: 'P2', maxAgeDays: 30 },
    ],
  },
  {
    id: 'P2.5',
    scope: 'program',
    name: '全局架构设计',
    goal: '组件之间怎么通信、通知走哪条通道、状态归谁、错误怎么分类——一次定清',
    consumes: ['PROGRAM.md（R 级）', 'P1 契约', 'P2 实际代码'],
    produces: [
      'ARCHITECTURE.md',
      'arch/{layers,communication,states,errors,streaming}.md',
      'arch/rules.json',
    ],
    substeps: [
      { id: 'p2.5.1', task: '层间规则与禁止边（与 ADR 0003 对齐）' },
      { id: 'p2.5.2', task: '通信机制矩阵：每类交互指定唯一机制，空白即停' },
      { id: 'p2.5.3', task: '状态归属教义：什么进 server cache / store / URL / 组件' },
      { id: 'p2.5.4', task: '错误分类（封闭枚举）+ 失败语义（三态、降级、重试边界）' },
      { id: 'p2.5.5', task: '流式与订阅：唯一入口、唯一 reducer、背压与取消' },
      {
        id: 'p2.5.6',
        task: '前端架构约定：arch/frontend.md 八节 + rules.json#frontend（层/状态分类/禁止写法/预算）',
      },
      { id: 'p2.5.7', task: '落 arch/rules.json（机器可读），并逐条送签' },
    ],
    checks: [
      { kind: 'file', path: 'ARCHITECTURE.md', minBytes: 400 },
      { kind: 'heading', path: 'ARCHITECTURE.md', text: '## 1. 层与禁止边' },
      { kind: 'heading', path: 'ARCHITECTURE.md', text: '## 2. 通信机制' },
      { kind: 'heading', path: 'ARCHITECTURE.md', text: '## 3. 状态归属' },
      { kind: 'heading', path: 'ARCHITECTURE.md', text: '## 5. 流式与订阅' },
      { kind: 'archRules', path: 'arch/rules.json' },
      { kind: 'frontendArch' },
      { kind: 'commMatrix', rules: 'arch/rules.json', table: 'arch/communication.md' },
      // 分层事实必须先于架构文档：从零写 AD 会写出本仓库没有的层（C-G 写成 application/ 就是这么来的）
      { kind: 'conventions' },
      { kind: 'signoff', artifact: 'ARCHITECTURE.md' },
    ],
  },
  {
    id: 'P3',
    scope: 'program',
    name: '能力切片与排期',
    // 不写死 god 数量：GODS.md 增减时这句会变成假话（本轮真实测试就撞到"15 个"）。
    goal: '把全部 god 归到若干能力 + 1 个底盘，定拓扑序与裁线',
    consumes: ['PROGRAM.md', 'P1 契约', 'P2 结果', 'P2.5 架构'],
    produces: ['CAPABILITIES.md'],
    substeps: [
      { id: 'p3.1', task: '按能力（不是按文件）归组；一个 god 只能属一个能力' },
      { id: 'p3.2', task: '定拓扑序（依赖无环）与每个能力的 R 级' },
      { id: 'p3.3', task: 'M1/M2 裁线：M1 = 能当日常工具用' },
      { id: 'p3.4', task: '每能力给 PR 预估与验收物（PM 视角）' },
      { id: 'p3.5', task: '逐条送签（裁线是产品决策）' },
    ],
    checks: [
      { kind: 'file', path: 'CAPABILITIES.md', minBytes: 300 },
      { kind: 'heading', path: 'CAPABILITIES.md', text: '## 1. 能力清单' },
      { kind: 'heading', path: 'CAPABILITIES.md', text: '## 2. 拓扑序' },
      { kind: 'heading', path: 'CAPABILITIES.md', text: '## 3. 裁线' },
      { kind: 'capabilityPlan' },
      { kind: 'signoff', artifact: 'CAPABILITIES.md' },
    ],
  },
  {
    id: 'P4',
    scope: 'program',
    name: '割接预案',
    goal: '割接不是一个日期，是一套可演练、可回滚的流程',
    consumes: ['CAPABILITIES.md', '数据兼容事实（PI_CODING_AGENT_DIR 共享）'],
    produces: ['cutover/PLAN.md'],
    substeps: [
      { id: 'p4.1', task: '割接日 + 双跑窗口 + pi-web 冻结归档方式' },
      { id: 'p4.2', task: '回滚条件与回滚命令（必须可执行，不是口号）' },
      { id: 'p4.3', task: '验收口径：对齐 MEMORY §6.3 五道门' },
      { id: 'p4.4', task: '预演标准：什么算预演通过' },
    ],
    checks: [
      { kind: 'file', path: 'cutover/PLAN.md', minBytes: 300 },
      { kind: 'heading', path: 'cutover/PLAN.md', text: '## 回滚' },
      { kind: 'heading', path: 'cutover/PLAN.md', text: '## 验收口径' },
      { kind: 'heading', path: 'cutover/PLAN.md', text: '## 预演标准' },
    ],
  },

  // ═══════════════════════ Chassis ═══════════════════════
  {
    id: 'H0',
    scope: 'chassis',
    name: '底盘契约',
    goal: 'zone / token / 路由 / 焦点 / 快捷键 / i18n 命名空间的具体契约，消费 AD 不得自定机制',
    consumes: ['arch/rules.json', 'contracts/{design-system,routes,i18n,interaction}.md'],
    produces: ['chassis/CONTRACT.md'],
    substeps: [
      { id: 'h0.1', task: 'zone 骨架与几何（区域名、最小/最大、断点）' },
      { id: 'h0.2', task: 'token 命名与命名空间（不逐个 token 化）' },
      { id: 'h0.3', task: '路由表与 URL 状态契约（哪些进 URL）' },
      { id: 'h0.4', task: '焦点与快捷键契约（焦点环、trap、skip link、键位表）' },
      { id: 'h0.5', task: 'i18n 命名空间划分' },
      { id: 'h0.6', task: '逐条送签' },
    ],
    checks: [
      { kind: 'file', path: 'chassis/CONTRACT.md', minBytes: 400 },
      { kind: 'heading', path: 'chassis/CONTRACT.md', text: '## 1. 区域与几何' },
      { kind: 'heading', path: 'chassis/CONTRACT.md', text: '## 2. Token 命名' },
      { kind: 'heading', path: 'chassis/CONTRACT.md', text: '## 3. 路由与 URL' },
      { kind: 'heading', path: 'chassis/CONTRACT.md', text: '## 4. 焦点与键盘' },
      { kind: 'heading', path: 'chassis/CONTRACT.md', text: '## 5. i18n 命名空间' },
      { kind: 'programPrereq', files: ['ARCHITECTURE.md', 'arch/rules.json'] },
      { kind: 'signoff', artifact: 'chassis/CONTRACT.md' },
    ],
  },
  {
    id: 'H1',
    scope: 'chassis',
    name: '布局与面板',
    goal: 'zone 容器、可拖拽面板、断点、持久化——不承载任何业务状态',
    consumes: ['chassis/CONTRACT.md'],
    produces: ['布局代码', 'chassis/layout.md'],
    substeps: [
      { id: 'h1.1', task: 'zone 容器与几何实现（最小/最大/默认，走 contract 的数字）' },
      { id: 'h1.2', task: '可拖拽面板 + 折叠/展开（状态来自 store，不来自组件）' },
      { id: 'h1.3', task: '断点策略与移动端形态' },
      { id: 'h1.4', task: '面板尺寸与开合持久化（刷新可恢复）' },
      { id: 'h1.5', task: '骨架屏/占位，避免布局跳动' },
    ],
    checks: [
      { kind: 'file', path: 'chassis/layout.md', minBytes: 200 },
      { kind: 'heading', path: 'chassis/layout.md', text: '## 断点矩阵' },
      { kind: 'heading', path: 'chassis/layout.md', text: '## 面板持久化' },
      { kind: 'heading', path: 'chassis/layout.md', text: '## 不承载的业务状态' },
    ],
  },
  {
    id: 'H2',
    scope: 'chassis',
    name: '应用框架',
    goal: '路由/URL、错误边界、通知通道、主题、i18n runtime、键盘映射、a11y primitives',
    consumes: ['chassis/CONTRACT.md', 'arch/{communication,errors,states}.md'],
    produces: ['框架代码', 'chassis/framework.md'],
    substeps: [
      { id: 'h2.1', task: '路由与 URL 同步（深链/后退/刷新矩阵）' },
      { id: 'h2.2', task: '错误边界 + 全局 loading/Suspense 边界' },
      { id: 'h2.3', task: '通知通道：单一 sink、幂等、去重（AD 的机制，不自造）' },
      { id: 'h2.4', task: '主题/密度/token 应用 + i18n runtime' },
      { id: 'h2.5', task: '键盘映射 + 焦点管理（trap/return/skip link）' },
    ],
    checks: [
      { kind: 'file', path: 'chassis/framework.md', minBytes: 250 },
      { kind: 'heading', path: 'chassis/framework.md', text: '## 路由与 URL 矩阵' },
      { kind: 'heading', path: 'chassis/framework.md', text: '## 通知通道' },
      { kind: 'heading', path: 'chassis/framework.md', text: '## 键盘与焦点' },
    ],
  },
  {
    id: 'H3',
    scope: 'chassis',
    name: '底盘验收',
    goal: '结构不变量全集对账 + 与 pi-web 并排对照；未分类差异必须为 0',
    consumes: ['H1', 'H2', 'surface.json（chassis 类表面点）'],
    produces: ['chassis/PARITY.md'],
    substeps: [
      { id: 'h3.1', task: '断点矩阵实跑（1280/1024/390）：不重叠、不塌陷、无横向滚动' },
      { id: 'h3.2', task: '键盘走查：每个 trap / 返回 / skip link' },
      { id: 'h3.3', task: 'token 与文案 lint：无裸值、无硬编码' },
      { id: 'h3.4', task: '与 pi-web 并排截图对照，差异逐条分类' },
    ],
    checks: [
      { kind: 'file', path: 'chassis/PARITY.md', minBytes: 250 },
      { kind: 'heading', path: 'chassis/PARITY.md', text: '## 结构不变量' },
      { kind: 'heading', path: 'chassis/PARITY.md', text: '## 差异分类' },
      { kind: 'sectionClean', path: 'chassis/PARITY.md', section: '## 结构不变量' },
    ],
  },

  // ═══════════════════════ Capability ═══════════════════════
  {
    id: 'C0',
    scope: 'capability',
    name: '立项',
    goal: '把本能力的范围与指纹钉死，并确认它已在能力表与全景表登记',
    consumes: ['CAPABILITIES.md', 'GODS.md', 'arch/rules.json'],
    produces: ['CHARTER.md'],
    substeps: [
      { id: 'c0.1', task: '从 CAPABILITIES.md 取本能力条目（含 R 级）' },
      { id: 'c0.2', task: '钉指纹：涉及的每个 god 的行数 + sha1，以磁盘为准' },
      { id: 'c0.3', task: '写不做清单与跨能力边界（谁不归我管）' },
      { id: 'c0.4', task: 'state.mjs init --scope capability --rlevel <R> 建档' },
    ],
    checks: [
      { kind: 'file', path: 'CHARTER.md', minBytes: 300 },
      { kind: 'heading', path: 'CHARTER.md', text: '## 1. 范围' },
      { kind: 'heading', path: 'CHARTER.md', text: '## 2. 基线指纹' },
      { kind: 'heading', path: 'CHARTER.md', text: '## 3. 不做清单' },
      { kind: 'godFingerprint' },
      { kind: 'godRegistry' },
      { kind: 'rlevel' },
      { kind: 'programPrereq', files: ['PROGRAM.md', 'CAPABILITIES.md', 'arch/rules.json'] },
    ],
  },
  {
    id: 'C1',
    scope: 'capability',
    name: '结构对账与表面枚举',
    goal: '「读全」机器可判：符号全集有分母、行区间无缝、**每个可交互表面点被枚举**',
    consumes: ['CHARTER.md', 'LSP', 'pi-web 源码'],
    produces: [
      'evidence/symbols-*.md',
      'symbol-map.md',
      'ownership.md',
      'cut-list.md',
      'surface.json',
    ],
    substeps: [
      { id: 'c1.1', task: 'code_resolve 导出符号全集到 evidence/symbols-<god>.md' },
      { id: 'c1.2', task: '分段精读，写 readlog：行区间 + 行为要点' },
      { id: 'c1.3', task: '写 ownership：行区间 → feature / chassis / infra / drop，区间无缝' },
      {
        id: 'c1.4',
        task: '写 symbol-map：每个符号 → 归属 / evo 落点 / 状态 / 理由（drop 必须给理由）',
      },
      {
        id: 'c1.5',
        task: 'enumerate-surface 枚举交互表面点（handler/命令/事件/URL/key/token/热键）',
      },
      { id: 'c1.6', task: 'state.mjs god 登记分母；state.mjs surface 登记表面点总数' },
    ],
    checks: [
      { kind: 'glob', dir: 'evidence', pattern: '^symbols-.*\\.md$', minBytes: 500 },
      { kind: 'file', path: 'readlog.md', minBytes: 100 },
      { kind: 'heading', path: 'readlog.md', text: '## 阅读日志' },
      { kind: 'file', path: 'ownership.md', minBytes: 100 },
      { kind: 'headingAny', path: 'ownership.md', texts: ['## 1. 归属区间表', '## 文件：'] },
      { kind: 'coverage', path: 'ownership.md' },
      { kind: 'ownershipTypes', path: 'ownership.md' },
      { kind: 'lines', mode: 'structure' },
      { kind: 'symbols' },
      { kind: 'lspSource' },
      { kind: 'surface', path: 'surface.json', min: 5, levels: ['R1', 'R2', 'R3'] },
    ],
  },
  {
    id: 'C2',
    scope: 'capability',
    name: '契约对齐',
    goal: '本能力用到的命令/事件/URL/i18n/token 都在冻结契约里；要改就提变更单',
    consumes: ['contracts/*.md（P1）', 'surface.json'],
    produces: ['contract-delta.md'],
    substeps: [
      { id: 'c2.1', task: '逐条对齐：本能力的命令/事件/路由/key/token 在契约中的位置' },
      { id: 'c2.2', task: '差异写成 delta 行；非空则提契约变更单（版本 +1）' },
      { id: 'c2.3', task: '变更单评估：影响哪些其他能力' },
    ],
    checks: [
      { kind: 'file', path: 'contract-delta.md', minBytes: 150 },
      { kind: 'heading', path: 'contract-delta.md', text: '## 对齐表' },
      { kind: 'contractAlign', path: 'contract-delta.md' },
      { kind: 'contractDelta', path: 'contract-delta.md' },
      { kind: 'contractInventory' },
      // god 自己不写 fetch 时（R2/R3 常见），HTTP 藏在 import 的兄弟模块里，必须沿 import 追
      { kind: 'externalIo' },
    ],
  },
  {
    id: 'C3',
    scope: 'capability',
    name: '行为规格',
    goal: '行为清单是交付分母：每条行为有 script_id、有证据；零孤儿脚本',
    consumes: ['surface.json', 'ownership.md', 'contract-delta.md', 'pi-web 源码'],
    produces: [
      'spec.md',
      'behaviors.md',
      'specs/*.md（仅 R3）',
      'harness/registry.json',
    ],
    substeps: [
      {
        id: 'c3.1',
        task: '写 spec.md：用户故事 + 源码行区间覆盖（多文件多区间） + 交互与导航（弹窗还是路由，带 path:line） + 与 pi-web 的布局映射；写完请用户签字',
      },
      { id: 'c3.2', task: '按表面点写行为行：ID / 触发 / 预期 / 证据 path:line / script_id' },
      { id: 'c3.2', task: '每条行为在 harness/registry.json 登记脚本' },
      { id: 'c3.3', task: 'R3 另写 specs/：端到端链路 + 决策表 + 落点' },
      { id: 'c3.4', task: '核对：无行为缺口（表面点全被认领）' },
    ],
    checks: [
      { kind: 'file', path: 'spec.md', minBytes: 400 },
      { kind: 'capSpec', path: 'spec.md' },
      // 需求理解错了，后面 30 条行为都是精致的错：这一份必须用户本人签
      { kind: 'humanSignoff', artifacts: ['spec.md'] },
      { kind: 'file', path: 'behaviors.md', minBytes: 200 },
      { kind: 'heading', path: 'behaviors.md', text: '## 行为清单' },
      { kind: 'behaviors', path: 'behaviors.md', registry: 'harness/registry.json' },
      { kind: 'specs', min: 1, levels: ['R3'] },
      { kind: 'specTests', levels: ['R3'] },
    ],
  },
  {
    id: 'C4',
    scope: 'capability',
    name: '能力设计',
    goal: '分解 / 接口 / 协议 / 状态 / 时序 / 模式 / 预算，外加实施图纸（组件树、hook、store、图）——设计可校验，不是散文',
    consumes: ['behaviors.md', 'surface.json', 'contract-delta.md', 'arch/rules.json'],
    // 只留三份文档 + 一份类型骨架：静态视图、动态视图、质量与测试策略。
    // 早先的 decomposition/protocols/states/patterns/principles 五份，读者要在 5 个文件之间
    // 拼同一件事（谁持有状态、接口怎么被调用），实际没人这么读——并进 components/dynamics。
    produces: [
      'design/manifest.json',
      'design/components.md（UML 静态视图：组件/hook/store 与依赖订阅）',
      'design/dynamics.md（动态视图：序列图 + 状态流图）',
      'design/quality.md（预算 + 测试策略）',
      'design/ui.md（ASCII 原型：主屏 + 空态 + 交互态，必须人工审核）',
      'design/interfaces.ts（类型骨架，被 components.md 引用）',
      'design/sequences/*.md（R3 单列长链路）',
      'plans/*.md（R2/R3）',
    ],
    substeps: [
      { id: 'c4.1', task: '职责分解：表面点 + 行为聚类成原子职责，逐个判「容器 / 展示」' },
      { id: 'c4.2', task: '接口与端口：签名 + 前置后置 + 错误语义，写成 TS 骨架（进 tsc）' },
      { id: 'c4.3', task: '协议：命令/事件/幂等/取消/重试；与 P1 契约的 delta' },
      { id: 'c4.4', task: 'store 设计：每 state 唯一 owner + 订阅者 + 生命周期，并画状态流图' },
      { id: 'c4.5', task: '序列图：每个跨边界流程一张，端口必须作为参与者出现（接口是被调用的）' },
      {
        id: 'c4.6',
        task: '关键取舍：症状 → 选了什么 → 被否方案 → 错判成本（写进 components.md 末尾）',
      },
      { id: 'c4.7', task: '质量预算：行数/复杂度/props/渲染/三态/文案，全部给数字' },
      {
        id: 'c4.10',
        task: '静态视图：components.md 用 mermaid 类图/流程图，组件标 «container»/«presenter»、hook 标 «hook»、store 标 «store»，依赖用 `-->`、订阅用 `..>`',
      },
      {
        id: 'c4.11',
        task: '源码溯源：每个元素的 sources 必须是本 god 的行区间，且与 ownership 归属逐段一致；派生元素写 rationale + derivedFrom',
      },
      {
        id: 'c4.12',
        task: '动态视图：dynamics.md 至少一张 sequenceDiagram（端口全部出现）+ 每个 store 一张 stateDiagram',
      },
      {
        id: 'c4.13',
        task: '测试策略：每层的测试写在哪、挡什么错（写进 quality.md，测试同学据此排期）',
      },
      { id: 'c4.8', task: '跑 design-gate（C4 段自动 --design-only），逐条送签' },
      {
        id: 'c4.9',
        task: '用 superpowers:writing-plans 产出 plans/<cap>.md：任务 / 设计元素 / 行为 / 验收命令 / 测试 ID',
      },
    ],
    checks: [
      { kind: 'file', path: 'design/manifest.json', minBytes: 200 },
      { kind: 'file', path: 'design/interfaces.ts', minBytes: 100 },
      { kind: 'file', path: 'design/components.md', minBytes: 200 },
      { kind: 'file', path: 'design/dynamics.md', minBytes: 200 },
      { kind: 'file', path: 'design/quality.md', minBytes: 200 },
      { kind: 'file', path: 'design/ui.md', minBytes: 300 },
      { kind: 'uiProto' },
      { kind: 'design', levels: ['R1', 'R2', 'R3'] },
      // 落点必须在已声明层里（C4 文件还没写，只判路径形态）
      { kind: 'placement', mode: 'plan' },
      { kind: 'lines', mode: 'bind' },
      { kind: 'plan', levels: ['R2', 'R3'] },
      { kind: 'signoff', artifact: 'design/manifest.json', levels: ['R2', 'R3'] },
      {
        kind: 'humanSignoff',
        artifacts: ['design/manifest.json', 'design/components.md', 'design/ui.md'],
      },
    ],
  },
  {
    id: 'C5',
    scope: 'capability',
    name: '实现',
    goal: '任务级执行：每个任务 TDD 落地、机器验证、双轴审查；设计与实现不漂移',
    consumes: ['plans/*.md', 'design/manifest.json', 'behaviors.md', '契约冻结'],
    produces: ['代码', 'gates/C5.json（机器证据）', 'review.md（R2/R3）'],
    substeps: [
      { id: 'c5.1', task: '在一个 worktree + 独立分支里开工，按 plans 的 T-xx 顺序推进' },
      {
        id: 'c5.2',
        task: '契约冻结 → 前后分离：先用桩把前端打通（桩是契约实现，返回夹具而非现编形状）',
      },
      { id: 'c5.3', task: '每个任务 TDD：先写断言（红）再写实现（绿）；红灯不许改测试' },
      { id: 'c5.4', task: '代码标 @design <元素ID>，state.mjs task 记账，便于中断续跑' },
      { id: 'c5.5', task: 'record-verification 真跑验收命令，落 gates/C5.json' },
      { id: 'c5.6', task: '每个 PR 前 requesting-code-review 双轴审查，落 review.md' },
      {
        id: 'c5.7',
        task: '联调：桩逐一换成真实现，落 integration.md（命令 / 桩 / 真实现 / 联调证据），行为脚本仍绿',
      },
    ],
    checks: [
      { kind: 'verification', id: 'C5' },
      { kind: 'lines', mode: 'landed' },
      { kind: 'quality', levels: ['R1', 'R2', 'R3'] },
      { kind: 'drift', levels: ['R2', 'R3'] },
      { kind: 'trace', levels: ['R2', 'R3'] },
      { kind: 'review' },
      { kind: 'placement', mode: 'landed' },
      // C 项：web 切片落点（骨架 + 组件落点），与仓库自己的 check-boundaries 互补
      { kind: 'webScaffold' },
      { kind: 'changePropagation' },
      { kind: 'volume' },
      { kind: 'behaviorScripts' },
      { kind: 'stub' },
      { kind: 'integration' },
    ],
  },
  {
    id: 'C6',
    scope: 'capability',
    name: '行为对账',
    goal: '同一脚本：30141 采集 / 30041 断言；差异逐条分类，未分类 = 0',
    consumes: ['behaviors.md', 'harness/', 'design/quality.md'],
    produces: ['parity.md'],
    substeps: [
      { id: 'c6.1', task: '跑全量行为脚本（capture → assert）' },
      { id: 'c6.2', task: '三维 diff：wire 调用 / DOM+a11y / 截图' },
      { id: 'c6.3', task: '逐条分类：可接受 / 缺陷 / 有意偏离（附理由）' },
      { id: 'c6.4', task: 'R3 另测渲染预算：会话切换与流式更新' },
    ],
    checks: [
      { kind: 'file', path: 'parity.md', minBytes: 250 },
      { kind: 'heading', path: 'parity.md', text: '## 行为对账结果' },
      { kind: 'heading', path: 'parity.md', text: '## 差异分类' },
      { kind: 'parity', path: 'parity.md' },
      { kind: 'denominator', doc: 'parity.md', source: 'behaviors.md', countFrom: 'rows:B-' },
      // P7 保真门：数据面对账管不到页面少了半个，所以另有一道
      { kind: 'fidelity' },
      // 语义门的配套：差异怎么分类、哪些属于「后期再调」，必须人签
      { kind: 'humanSignoff', artifacts: ['parity.md'] },
      { kind: 'acceptance', mode: 'pre' },
      { kind: 'verification', id: 'C6' },
      { kind: 'heading', path: 'parity.md', text: '## 渲染预算', levels: ['R3'] },
    ],
  },
  {
    id: 'C7',
    scope: 'capability',
    name: '收割回灌',
    goal: '教训变成规则/契约/技能，而不是留在对话里',
    consumes: ['本能力全部产出'],
    produces: [
      'retro.md',
      'acceptance.md（L6 人工验收已签）',
      'GODS.md / CAPABILITIES.md 状态更新',
    ],
    substeps: [
      { id: 'c7.1', task: '复盘：哪些设计判断错了、哪些门太松/太紧' },
      { id: 'c7.2', task: '每条教训指定落地位置（规则文件 / 契约变更 / issue）' },
      { id: 'c7.3', task: '跨能力问题提到 Program（待决项）' },
      { id: 'c7.4', task: '回写 GODS.md 与 CAPABILITIES.md 状态' },
      {
        id: 'c7.5',
        task: 'L6 人工验收：acceptance.md 的 L6 行写签字人与结论（agent 不得代签）',
      },
    ],
    checks: [
      { kind: 'file', path: 'retro.md', minBytes: 150 },
      { kind: 'heading', path: 'retro.md', text: '## 教训与落地' },
      { kind: 'retro', path: 'retro.md' },
      { kind: 'acceptance', mode: 'final' },
      { kind: 'godStatus', status: '已完成' },
    ],
  },

  // ═══════════════════════ Cutover ═══════════════════════
  {
    id: 'X0',
    scope: 'cutover',
    name: '割接预演',
    goal: '用真实数据副本在 30041 跑完整日流程，并演练回滚',
    consumes: ['全部能力 C6 通过', 'cutover/PLAN.md'],
    produces: ['cutover/REHEARSAL.md'],
    substeps: [
      { id: 'x0.1', task: '真实数据副本（不写 live ~/.pi/agent）' },
      { id: 'x0.2', task: '跑完整日流程：开项目 → 多会话 → 发送 → 中断 → 恢复 → 文件预览' },
      { id: 'x0.3', task: '演练回滚：实跑一次回滚命令' },
      { id: 'x0.4', task: '已知缺陷清单交用户确认' },
    ],
    checks: [
      { kind: 'file', path: 'cutover/REHEARSAL.md', minBytes: 250 },
      { kind: 'heading', path: 'cutover/REHEARSAL.md', text: '## 全日流程' },
      { kind: 'heading', path: 'cutover/REHEARSAL.md', text: '## 回滚演练' },
      { kind: 'sectionClean', path: 'cutover/REHEARSAL.md', section: '## 全日流程' },
    ],
  },
  {
    id: 'X1',
    scope: 'cutover',
    name: '割接',
    goal: 'big-bang 切换；用户浏览器验收；pi-web 冻结归档',
    consumes: ['X0 通过'],
    produces: ['cutover/RUNBOOK-executed.md'],
    substeps: [
      { id: 'x1.1', task: '按 runbook 执行割接' },
      { id: 'x1.2', task: '用户按 MEMORY §6.3 五道门验收' },
      { id: 'x1.3', task: 'pi-web 冻结归档（只读）' },
    ],
    checks: [
      { kind: 'file', path: 'cutover/RUNBOOK-executed.md', minBytes: 200 },
      { kind: 'heading', path: 'cutover/RUNBOOK-executed.md', text: '## 执行记录' },
      { kind: 'heading', path: 'cutover/RUNBOOK-executed.md', text: '## 用户验收' },
      { kind: 'verification', id: 'X1', maxAgeDays: 7 },
      { kind: 'programAudit' },
    ],
  },
  {
    id: 'X2',
    scope: 'cutover',
    name: '复盘',
    goal: '遗留项全部有 issue 号；规则/契约更新已提交',
    consumes: ['X1'],
    produces: ['cutover/POSTMORTEM.md'],
    substeps: [
      { id: 'x2.1', task: '遗留项结转（issue 号）' },
      { id: 'x2.2', task: '更新 ADR / MEMORY / 架构规则' },
      { id: 'x2.3', task: '关闭 program/capability 各 run' },
    ],
    checks: [
      { kind: 'file', path: 'cutover/POSTMORTEM.md', minBytes: 200 },
      { kind: 'heading', path: 'cutover/POSTMORTEM.md', text: '## 遗留项' },
      { kind: 'decisionsClosed', path: 'cutover/POSTMORTEM.md' },
    ],
  },
]

export const PHASE_IDS = PHASES.map((p) => p.id)

export function phaseById(id) {
  return PHASES.find((p) => p.id === id) || null
}

export function phasesOf(scope) {
  return (SCOPE_PHASES[scope] || []).map(phaseById).filter(Boolean)
}

export function nextPhaseId(scope, id) {
  const list = SCOPE_PHASES[scope] || []
  const i = list.indexOf(id)
  return i < 0 || i === list.length - 1 ? null : list[i + 1]
}

export function firstPhaseId(scope) {
  return (SCOPE_PHASES[scope] || [null])[0]
}

// 某个门是否适用于给定 R 级（未声明 levels = 全等级适用）
export function checkApplies(check, level) {
  return !check.levels || check.levels.includes(level)
}

export function substepsOf(id) {
  const p = phaseById(id)
  return p ? p.substeps : []
}
