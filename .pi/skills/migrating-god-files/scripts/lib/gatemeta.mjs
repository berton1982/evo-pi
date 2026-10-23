/**
 * 门的能力元数据（P1）—— 每道门"能抓什么、抓不到什么"必须写在门自己的登记里。
 *
 * 起因（C-G 试点实测）：54 道门全部通过，用户看了一眼界面就说"差距很大"。
 * 门没撒谎——它只是从来没声称能判断"信息量够不够""交互形态对不对"。
 * 问题是这个边界**没写下来**，于是"全绿"被当成了"可交付"。
 *
 * 三层：
 *  - existence：只判"有没有"（文件、小节、字段）。最容易被铺底/占位满足 → 假绿风险最高。
 *  - structure：判"结构对不对"（闭合、一致、可复算、sha 固定）。当前大部分门在这里。
 *  - semantic：判"语义合不合理"。机器判不了，只能人签 —— 所以这一层必须配 humanSignoff。
 *
 * `check-gates-map.mjs` 会强制：每个 kind 都有 meta；semantic 层的 kind 所在阶段
 * 必须同时有 humanSignoff，否则报"语义门没有人工仲裁"。
 */
export const GATE_META = {
  acceptance: { layer: 'structure', canCatch: '六层阶梯缺层、L6 未签、签字像 agent', cannotCatch: 'L6 用户是否真的看懂了界面' },
  archRules: { layer: 'structure', canCatch: 'rules.json 结构缺项、层序非法', cannotCatch: '这套分层是否适合本项目' },
  behaviorScripts: { layer: 'existence', canCatch: '行为声明的脚本文件不存在', cannotCatch: '脚本是否真的断言了该行为' },
  behaviors: { layer: 'structure', canCatch: '行为无证据锚点、无脚本、重复 id', cannotCatch: '行为清单是否覆盖了用户真正在意的点' },
  capSpec: { layer: 'structure', canCatch: '缺用户故事/源码行区间/交互机制/人工决策', cannotCatch: '故事写得对不对、机制选得好不好' },
  capabilityPlan: { layer: 'structure', canCatch: 'god 未归入能力、拓扑序缺失', cannotCatch: '能力边界切得合不合理' },
  commMatrix: { layer: 'structure', canCatch: '交互矩阵缺「反例」列', cannotCatch: '选择的机制是否最优' },
  contractAlign: { layer: 'structure', canCatch: '对齐行无契约指向、有差异无 CHG', cannotCatch: '登记的命令是不是这个能力真正用到的' },
  contractDelta: { layer: 'structure', canCatch: '缺对齐表、无变更单编号', cannotCatch: '差异分类是否正确' },
  contractInventory: { layer: 'structure', canCatch: '源码有、契约缺的端点（分母来自表面点）', cannotCatch: 'god 自己不写 fetch 时（见 externalIo）' },
  contracts: { layer: 'existence', canCatch: '契约文件缺/过小', cannotCatch: '契约内容是否与源码一致' },
  coverage: { layer: 'structure', canCatch: '行区间空洞、重叠、drop 无条目', cannotCatch: '切分是否合理' },
  decisionsClosed: { layer: 'structure', canCatch: '决策项没有结论/未关闭', cannotCatch: '决策本身对不对' },
  denominator: { layer: 'structure', canCatch: '分母无来源、sha 不匹配、条数与来源不符', cannotCatch: '来源文件本身是否正确' },
  design: { layer: 'structure', canCatch: 'D1–D19 组合（覆盖/协议/图/出处/实践）', cannotCatch: '设计是否优雅、是否过度分层' },
  drift: { layer: 'structure', canCatch: '代码里有 @design 但设计无此元素', cannotCatch: '标注是否贴在正确的代码块上' },
  envReady: { layer: 'structure', canCatch: '端口/变量/构建/版本未成文', cannotCatch: '环境是否真的能跑起来（那是 harness 的事）' },
  externalIo: { layer: 'structure', canCatch: '沿 import 追到但没登记的 HTTP 依赖', cannotCatch: '间接三层以上的动态依赖' },
  file: { layer: 'existence', canCatch: '文件缺/过小/仍是铺底模板', cannotCatch: '文件里写的内容对不对' },
  fixtures: { layer: 'existence', canCatch: '夹具目录为空', cannotCatch: '夹具是否覆盖真实数据形状' },
  frontendArch: { layer: 'structure', canCatch: '前端八节缺项、状态分类不足', cannotCatch: '这些约定是否适合本项目前端' },
  glob: { layer: 'existence', canCatch: '匹配不到文件', cannotCatch: '文件内容' },
  godFingerprint: { layer: 'structure', canCatch: 'god 文件 sha/行数与登记不符', cannotCatch: '是否该从这份源码迁移' },
  godRegistry: { layer: 'structure', canCatch: 'god 未在 GODS.md 登记', cannotCatch: 'GODS.md 是否完整' },
  godRegistryClosed: { layer: 'structure', canCatch: '登记为「待开始」却被跑（C0 阶段）', cannotCatch: '状态是否被人为改成完成' },
  godStatus: { layer: 'existence', canCatch: 'GODS.md 状态未更新为已完成', cannotCatch: '完成后是否真的等价' },
  godsHaveR: { layer: 'structure', canCatch: 'god 缺 R 级', cannotCatch: 'R 级判定是否合理' },
  harness: { layer: 'structure', canCatch: 'registry 结构非法、captured 缺快照', cannotCatch: '快照是否代表真实交互' },
  heading: { layer: 'existence', canCatch: '缺指定小节', cannotCatch: '小节内容' },
  headingAny: { layer: 'existence', canCatch: '多个写法都接受时缺失', cannotCatch: '小节内容' },
  humanSignoff: {
    canCatch: '缺签字/无 --saw 依据/agent 代签/签字后改动/改签链断裂（换人未先 unsign）',
    cannotCatch: '签字人是否真的逐条看过（只有 --saw 可追溯）',
    layer: 'structure',
  },
  integration: { layer: 'structure', canCatch: '联调替换表缺行、真实现写成桩', cannotCatch: '替换后行为是否真的等价' },
  lines: { layer: 'structure', canCatch: '行级三档（structure/bind/landed）空洞', cannotCatch: '迁移后的语义是否等价' },
  lspSource: { layer: 'structure', canCatch: '符号分母不是 tsserver 采集 / 与 meta 不符', cannotCatch: '采集到的符号是否需要迁' },
  ownershipTypes: { layer: 'structure', canCatch: '区间类型非法/越界', cannotCatch: '区间切得对不对' },
  parity: { layer: 'structure', canCatch: 'blocked 超半、缺导航维度、结论不是闭集', cannotCatch: '「一致」是否为真（需 30141 采集）' },
  plan: { layer: 'structure', canCatch: '任务表缺列/空行', cannotCatch: '任务拆得够不够细' },
  programAudit: { layer: 'existence', canCatch: '纲领审计小节缺失', cannotCatch: '审计结论是否正确' },
  programPrereq: { layer: 'structure', canCatch: '能力 run 缺 program 前置产物', cannotCatch: '前置产物质量' },
  quality: { layer: 'structure', canCatch: '预算超限（行数/props/复杂度）', cannotCatch: '预算数字是否合理' },
  retro: { layer: 'structure', canCatch: '复盘缺小节/缺教训', cannotCatch: '教训是否深刻' },
  review: {
    layer: 'structure',
    canCatch: '12 项清单缺项/结论非法/fix 无 file:line/度量超限未被登记',
    cannotCatch: 'reviewer 的判断是否专业（清单填满照样可能没看出问题）',
  },
  conventions: {
    layer: 'structure',
    canCatch: '规则来自"想象"：layerPaths 指向不存在的目录 / AD 没提真实存在的层',
    cannotCatch: '分层是否合理（只保证文档与仓库事实一致）',
  },
  fidelity: {
    layer: 'semantic',
    canCatch: 'pi-web 独有的可及元素没在差异表登记、覆盖率低于阈值、只拍了一侧',
    cannotCatch: '视觉细节（间距/色值/字重）；两个元素是否真的语义等价',
  },
  webScaffold: {
    layer: 'structure',
    canCatch: '组件落在 features/shell/app/ui 之外、切片缺 hook/view 骨架、缺 _template 参照、src 根下放组件',
    cannotCatch: '切片内部文件是否还在长大（那是行数/密度判据）',
  },
  placement: {
    layer: 'structure',
    canCatch: '落点不在已声明层 / adapters 写进 web / 客户端组件 import node:* 或 core 源码',
    cannotCatch: '这个文件是不是该拆（只判位置，不判职责）',
  },
  rlevel: { layer: 'structure', canCatch: 'R 级缺失/非法', cannotCatch: '分级是否合理' },
  sectionClean: { layer: 'structure', canCatch: '指定小节里还有 ❌', cannotCatch: '❌ 的处理方式是否正确' },
  signoff: { layer: 'structure', canCatch: '产物未送签/签字后改动', cannotCatch: '签字人是否审过' },
  specTests: { layer: 'structure', canCatch: '决策表缺测试 ID / ID 未落地', cannotCatch: '测试是否测到了点子上' },
  specs: { layer: 'structure', canCatch: '决策无证据锚点/含禁词', cannotCatch: '决策是否正确' },
  stub: { layer: 'structure', canCatch: '本能力 HTTP 表面点无桩', cannotCatch: '桩的行为是否与真实现一致' },
  stubPlan: { layer: 'structure', canCatch: '桩清单缺行/ready 但文件不在', cannotCatch: '桩的形状是否来自算法规格' },
  surface: { layer: 'structure', canCatch: '表面点数量/分母来源', cannotCatch: '表面点是否被正确认领（那是 D2）' },
  symbols: { layer: 'structure', canCatch: '符号遗漏/过期/虚报', cannotCatch: '符号是否值得迁' },
  trace: { layer: 'structure', canCatch: '四向追踪断裂（任务↔元素↔行为↔测试）', cannotCatch: '追踪关系是否符合真实依赖' },
  uiProto: { layer: 'structure', canCatch: 'ASCII 原型缺块/缺区域词/缺交互态', cannotCatch: '原型是否好用、信息层级对不对' },
  verification: { layer: 'structure', canCatch: '证据缺失/失败/过期', cannotCatch: '命令是否覆盖了关键路径' },
  volume: { layer: 'structure', canCatch: '工件超预算、符号表未去重、出现废弃文件', cannotCatch: '剩下的内容是否有价值' },
  wireTable: { layer: 'structure', canCatch: '命令/事件表为空', cannotCatch: '表里的端点是否完整' },
  changePropagation: { layer: 'structure', canCatch: '砍单无变更单、视图未勾、skip 无理由', cannotCatch: '视图列表是否漏了某个真实受影响处' },
}

/** 语义层：机器判不了，必须由人签。目前没有门自称语义层——这是诚实，不是遗漏。 */
export const SEMANTIC_KINDS = new Set(
  Object.entries(GATE_META)
    .filter(([, m]) => m.layer === 'semantic')
    .map(([k]) => k),
)

export const LAYER_ZH = {
  existence: '存在性',
  structure: '结构',
  semantic: '语义（须人签）',
}

/**
 * 反向用例索引：kind → selftest.mjs 里那条"必须红"的断言标签。
 *
 * 为什么要这张表（C-G 试点教训）：门写对了但没人喂过坏数据，等于没验过门。
 * 表里的标签必须能在 `scripts/selftest.mjs` 里搜到，否则 `check-gates-map` 报红——
 * 这样"我加了个反向用例"就不是一句自述，而是一条可核对的事实。
 *
 * 没进这张表的 kind 一律视为"还没有反向用例"，`references/gates.md` 会逐条列出来。
 */
export const NEGATIVE_TESTS = {
  contractAlign: 'C2 对齐行既无指向也无编号红',
  contractDelta: 'C2 有差异却无 CHG 号红',
  contractInventory: 'C2 源码端点未进契约红',
  surface: '表面漂移 --check 报红',
  lspSource: 'C1 手填分母不认：缺 meta 红',
  design: 'D2 表面未认领 → 红',
  drift: 'DRIFT 隐性设计 → 红',
  bind: 'BIND 孤儿脚本 → 红',
  quality: 'Q1 超行数 → 红',
  plan: 'PLAN 缺计划 → C4 红',
  trace: 'TRACE 设计元素无人实现 → 红',
  review: 'REVIEW 缺「死代码与重复」→ C5 红',
  conventions: 'CONV layerPaths 指向不存在的目录 → P2.5 红',
  placement: 'PLACEMENT adapters 写进 web → C4 红',
  fidelity: 'FID 未登记的 pi-web 元素 → C6 红',
  webScaffold: 'WEB 组件落在 src/components 下 → C5 红',
  verification: 'VERIFY 失败证据 → C5 红',
  volume: 'VOLUME 判断型文档超 400 行 → 红',
  humanSignoff: 'C3 规格 agent 签字后仍拒绝',
  parity: 'C6 分类写 todo 时拒绝（闭集）',
  file: 'P0 模板未填写时拒绝',
  denominator: 'C6 对账分母 → 条数与来源不符时红',
  changePropagation: 'P3 砍单无变更单 → 红',
  envReady: 'P1 环境矩阵缺项 → 红',
}

/** 覆盖率下限：低于这个数说明"门在裸奔"，直接判红。 */
export const NEGATIVE_FLOOR = 0.2
