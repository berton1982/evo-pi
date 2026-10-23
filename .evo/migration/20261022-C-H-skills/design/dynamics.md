# 动态视图 — C-H「设置 · 技能」

> 静态图说"谁是谁"，这里说"**接口怎么被调用、状态怎么流转、失败怎么收尾**"。
> 给实施的人看：每张序列图就是一个要写的函数体骨架。
> 给测试的人看：`alt` 分支就是用例清单——每条 `else` 至少一个测试。
> 机器判据：D13（节点 id 已声明）· **D17**（≥1 张 `sequenceDiagram` 且每个端口出现；每个 store 至少一张 `stateDiagram`）。

## 1. 首次加载（`B-001` / `B-002`）

```mermaid
sequenceDiagram
  autonumber
  participant U as C-01 SkillsPanel
  participant H as H-01 useSkillsView
  participant UC as D-B-01 ListSkills
  participant P as P-S-01 SkillRepository

  U->>H: 挂载（cwd, trust）
  H->>H: generation = ++seq
  H->>UC: list({ cwd })
  UC->>P: listSkills(cwd)
  alt 成功
    P-->>UC: Skill[]
    UC-->>H: ok(skills)
    H->>H: generation 仍是当前 ? 写入 ST-01 : 丢弃
    H-->>U: 渲染列表（selected 为空则选中第一项）
  else 读取失败
    P-->>UC: err(code)
    UC-->>H: err(SKILL_READ_FAILED, detail)
    H->>H: 写入 ST-01.error
    H-->>U: 渲染错误态（含重试按钮）
  end
```

**为什么带 `generation`**：`trustKey` 变化时源码会整体重载（`:692`）；用户连续切项目时旧请求可能后到，不丢弃就会把 A 项目的技能画进 B 项目。

## 2. 开关一个技能（`B-006`，乐观 + 回滚）

```mermaid
sequenceDiagram
  autonumber
  participant U as C-02 SkillDetail
  participant H as H-01 useSkillsView
  participant UC as D-B-04 ToggleSkill
  participant P as P-S-01 SkillRepository
  participant S as ST-02 skillToggle

  U->>H: onToggle(skill.filePath, next)
  H->>S: toggling.add(filePath)
  H->>H: 本地把该条 enabled 改成 next（乐观）
  H->>UC: toggle({ filePath, enabled: next })
  UC->>P: setEnabled(filePath, next)
  alt 成功
    P-->>UC: ok()
    UC-->>H: ok()
    H->>S: toggling.delete(filePath)
    H-->>U: 保持新状态（无需重渲染整表）
  else 失败
    P-->>UC: err(code)
    UC-->>H: err(SKILL_SAVE_FAILED)
    H->>H: 按 filePath 精确回滚该条
    H->>S: saveError[filePath] = code
    H-->>U: 该行标红 + 显示错误码（其余行不受影响）
  end
```

## 3. 批量开关（`B-007`）

```mermaid
sequenceDiagram
  autonumber
  participant U as C-01 SkillsPanel
  participant H as H-01 useSkillsView
  participant UC as D-B-05 ToggleSkillGroup
  participant P as P-S-01 SkillRepository

  U->>H: onToggleGroup(ids, next)
  H->>H: 全部乐观置为 next，记录 before 快照
  H->>UC: toggleGroup({ filePaths: ids, enabled: next })
  UC->>P: setEnabledBatch(filePaths, next)
  alt 全部成功
    P-->>UC: ok(results[])
    UC-->>H: ok(results[])
    H-->>U: 清空 groupStatus
  else 部分失败
    P-->>UC: ok(results[] 含 failed)
    UC-->>H: ok(results[])
    H->>H: 逐条按 results 回填（失败的恢复 before，成功的保留）
    H-->>U: 显示"n 个失败"并列出失败的技能名
  end
```

## 3.5 市场搜索与安装（`B-011` / `B-012`）

```mermaid
sequenceDiagram
  autonumber
  participant U as C-03 AddSkillPanel
  participant H as H-03 useSkillAdd
  participant MK as P-S-03 SkillMarket
  participant REPO as P-S-01 SkillRepository
  participant INS as D-B-06 InstallSkill

  U->>H: onChange(query)
  H->>MK: search(query)
  alt 有结果
    MK-->>H: ok(SkillMarketItem[])
    H-->>U: 渲染结果列表（可键盘选中）
  else 无结果 / 搜索失败
    MK-->>H: ok([]) 或 err(MARKET_UNAVAILABLE)
    H-->>U: "没有匹配的技能" / 错误码 + 保留输入
  end
  U->>H: onInstall(item)
  H->>INS: install({ source })
  INS->>MK: fetchPackage(source)
  INS->>REPO: listSkills(cwd)（安装后刷新）
  alt 成功
    INS-->>H: ok(skill)
    H-->>U: 标记已安装，调用 onInstalled(skill) 让 C-01 局部插入
  else 失败
    INS-->>H: err(SKILL_INSTALL_FAILED)
    H-->>U: 该行显示错误，输入与结果保留
  end
```

## 4. 读详情原文（`B-008`，可取消）

```mermaid
sequenceDiagram
  autonumber
  participant U as C-02 SkillDetail
  participant H as H-02 useSkillDetail
  participant P as P-S-02 SkillContentReader

  U->>H: 选中技能 / 切换技能
  H->>P: readContent(filePath, { signal })
  alt 用户先切走了
    U->>H: 取消（AbortController.abort）
    H->>P: signal 已中止
    P-->>H: err(ABORTED)
    H->>H: 不写 ST-04（避免把 A 的正文写进 B 的面板）
  else 正常返回
    P-->>H: ok(markdown)
    H->>H: 写入 ST-04.instructions + documents
    H-->>U: 渲染正文与文档列表
  end
```

## 5. 状态流（每个 store 一张）

### 5.1 `ST-01 skillsView`

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: 挂载 / cwd 变化
  loading --> ready: ok(skills)
  loading --> failed: err(code)
  failed --> loading: 点重试
  ready --> loading: trustKey 变化
  ready --> ready: 选中项变化（不清列表）
  ready --> [*]: 卸载
```

### 5.2 `ST-02 skillToggle`

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> pending: onToggle
  pending --> idle: ok
  pending --> rollback: err
  rollback --> idle: 用户关闭错误提示
  note right of rollback
    只回滚该 filePath，
    不动其它行的乐观状态
  end note
```

### 5.3 `ST-03 skillUpdates`

```mermaid
stateDiagram-v2
  [*] --> untouched
  untouched --> checking: 检查单条 / 检查全部
  checking --> hasUpdate: update_available
  checking --> noUpdate: up_to_date
  checking --> checkFailed: err
  hasUpdate --> updating: 点更新
  updating --> updated: ok
  updating --> updateFailed: err
  checkFailed --> checking: 重试
```

### 5.4 `ST-04 skillDetail`

```mermaid
stateDiagram-v2
  [*] --> closed
  closed --> loading: 选中技能
  loading --> shown: ok(markdown)
  loading --> loadFailed: err
  loadFailed --> loading: 重试
  shown --> closed: 关闭面板 / 切换技能
```

### 5.5 `ST-05 skillAdd`

```mermaid
stateDiagram-v2
  [*] --> empty
  empty --> searching: 输入关键词
  searching --> results: ok(list)
  searching --> searchFailed: err
  results --> installing: 点安装
  installing --> installed: ok
  installing --> installFailed: err
  installed --> results: 继续搜索
  results --> empty: 清空输入
```

## 6. 失败与取消：谁负责收尾

| 场景 | 谁发起取消 | 谁负责回收 | 不回收的后果 |
|---|---|---|---|
| 切技能时详情还在加载 | `H-02`（`AbortController`） | `P-S-02` 收到 signal 中止，`H-02` 丢弃结果 | 旧正文盖住新技能 |
| `cwd` 变化时列表还在请求 | `H-01`（`generation` 递增） | `H-01` 比对 generation 丢弃 | A 项目技能画进 B 项目 |
| 卸载时开关请求未回 | 组件卸载 | `H-01` 的清理函数置 `mounted=false` | React 警告 + 状态错乱 |
| 批量部分失败 | 不取消 | `D-B-05` 返回 `results[]`，`H-01` 逐条回填 | 一半 UI 显示成功实际失败 |

## 7. 行为 ↔ 图对应

| 行为 | 图 |
|---|---|
| `B-001` 首次加载 / `B-002` trustKey 重载 | §1、§5.1 |
| `B-004` 加载失败与重试 | §1 `else` 分支、§5.1 |
| `B-006` 单开关 | §2、§5.2 |
| `B-007` 批量开关 | §3 |
| `B-008` 读详情原文 | §4、§5.4 |
| `B-011`/`B-012` 搜索与安装 | §5.5 |
| `B-013`/`B-014`/`B-015` 检查与更新 | §5.3 |
