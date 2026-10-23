# 行为清单 — C-G（MCP 设置）

> 判据：每条行为必须能被一个 harness 脚本证实；证据是 pi-web 源码的行号（`ref_projects/pi-web/components/McpConfig.tsx`）。
> 校验：`check-phase.mjs --phase C3`（`behaviors` 门 + `behaviorScripts` 门，双向绑定、零孤儿）。

## 行为清单

| id | 说明 | 证据 | script_id | 是否 headless |
|---|---|---|---|---|
| B-001 | 首载拉清单并按作用域分组 | ref_projects/pi-web/components/McpConfig.tsx:295 | s-001 | 是 |
| B-002 | 信任态/工作目录变化触发重载 | ref_projects/pi-web/components/McpConfig.tsx:882 | s-002 | 是 |
| B-003 | 后到响应胜出，旧响应不落库 | ref_projects/pi-web/components/McpConfig.tsx:520 | s-003 | 是 |
| B-004 | 清单读失败整体降级，不显示半份 | ref_projects/pi-web/components/McpConfig.tsx:660 | s-004 | 是 |
| B-005 | 无 server 时显示空态 | ref_projects/pi-web/components/McpConfig.tsx:1055 | s-005 | 是 |
| B-006 | 分组顺序固定 user → project | ref_projects/pi-web/components/McpConfig.tsx:1306 | s-006 | 是 |
| B-007 | 组头计数由该组现算 | ref_projects/pi-web/components/McpConfig.tsx:1293 | s-007 | 是 |
| B-008 | 选中行 → 详情面板接管 | ref_projects/pi-web/components/McpConfig.tsx:626 | s-008 | 是 |
| B-009 | 未选中时显示占位 | ref_projects/pi-web/components/McpConfig.tsx:1003 | s-009 | 是 |
| B-010 | 选中项跨刷新保持（内存态） | ref_projects/pi-web/components/McpConfig.tsx:698 | s-010 | 是 |
| B-011 | 单条开关落盘 disabled | ref_projects/pi-web/components/McpConfig.tsx:600 | s-011 | 是 |
| B-012 | 停用后再启用可回滚 | ref_projects/pi-web/components/McpConfig.tsx:592 | s-012 | 是 |
| B-013 | 撤销条 8s 内可回滚 | ref_projects/pi-web/components/McpConfig.tsx:733 | s-013 | 否 |
| B-014 | 测试进行中不重复排队 | ref_projects/pi-web/components/McpConfig.tsx:1860 | s-014 | 是 |
| B-015 | 测试结果按 key 回填对应行 | ref_projects/pi-web/components/McpConfig.tsx:1909 | s-015 | 是 |
| B-016 | 空态文案可读（不是空白） | ref_projects/pi-web/components/McpConfig.tsx:1055 | s-016 | 是 |
| B-017 | 添加面板打开 | ref_projects/pi-web/components/McpConfig.tsx:1082 | s-017 | 否 |
| B-018 | 添加成功后刷新列表 | ref_projects/pi-web/components/McpConfig.tsx:417 | s-018 | 否 |
| B-019 | 组头按钮切整组 | ref_projects/pi-web/components/McpConfig.tsx:737 | s-019 | 是 |
| B-020 | 组批量部分失败逐条回填 | ref_projects/pi-web/components/McpConfig.tsx:790 | s-020 | 否 |
| B-021 | 批量后组头计数即时更新 | ref_projects/pi-web/components/McpConfig.tsx:1293 | s-021 | 是 |
| B-022 | 项目未信任时提示并跳转 | ref_projects/pi-web/components/McpConfig.tsx:1830 | s-022 | 否 |
| B-027 | 发起签到进入等待授权 | ref_projects/pi-web/components/McpConfig.tsx:538 | s-027 | 否 |
| B-028 | 轮询期间显示等待态 | ref_projects/pi-web/components/McpConfig.tsx:530 | s-028 | 否 |
| B-029 | 取消签到调用 DELETE | ref_projects/pi-web/components/McpConfig.tsx:1830 | s-029 | 否 |
| B-030 | 状态行三态文案互斥 | ref_projects/pi-web/components/McpConfig.tsx:1909 | s-030 | 是 |
| B-031 | 状态行日志可展开/收起 | ref_projects/pi-web/components/McpConfig.tsx:1712 | s-031 | 否 |
| B-032 | 移除一个 server 后列表与磁盘同步，选中项清空 | `ref_projects/pi-web/components/McpConfig.tsx:1293` | s-032 |

## 未实测声明

本能力尚无 harness 快照（`harness/registry.json` 的 flows 全为 pending），以上证据全部来自源码阅读，不是采集成品。

## 表面点分账

156 个表面点（i18n 87 / handler 46 / role 12 / hotkey 1 / api 0）已在 `surface.json` 与 `design/manifest.json` 的 `surfaces` 中逐条认领。

> B-023…B-026（Code mode 读取/保存/预算/被后到取代）本次不迁，已从清单移除，见 `spec.md` 不做清单。
