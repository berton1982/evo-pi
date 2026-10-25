# 规格 S-02：工具调用与 diff 渲染

### 端到端链路

1. agent 产生 `tool_execution_start` → 容器插入工具调用块（`ref_projects/pi-web/components/MessageView.tsx:1176`）
2. 运行中显示 spinner 与参数摘要（`ref_projects/pi-web/components/MessageView.tsx:1176-1344`）；时长来自 `recordedDurationMs` 优先、否则按本地时间差（`ref_projects/pi-web/components/MessageView.tsx:1158-1176`），小于 `TOOL_DURATION_MIN_MS` 不显示
3. `tool_execution_end` → 结果绑定到该块（按 `toolCallId`，不按顺序）
4. 若工具是 `apply_patch`：解析结果文本 → `SplitDiffFile[]`（`ref_projects/pi-web/components/MessageView.tsx:1578-1593`）
5. 解析成功 → 左右两栏 diff（`ref_projects/pi-web/components/MessageView.tsx:1364-1507`）；解析失败 → 纯文本 patch（`ref_projects/pi-web/components/MessageView.tsx:1508-1577`）
6. 若工具结果是子代理：显示"打开子代理"入口并回调 `onOpenSubagent`（`ref_projects/pi-web/components/MessageView.tsx:1151-1175`）
7. 工具块与文本块按原顺序混排，不分组、不重排（`MV:993` `BlockView`）

### 决策表

| 选项 | 结论 | 被否方案 | 判错代价 | 证据 |
|---|---|---|---|
| 结果绑定 | 按 `toolCallId` | 按出现顺序配对 | 并行工具时结果串到别的调用上，用户看到"工具 A 的结果"挂在 B 下 | `ref_projects/pi-web/components/MessageView.tsx:1176` |
| diff 解析失败 | 降级为纯文本并保留原文 | 抛错/空白 | 用户看不到改动，只能重跑 | `ref_projects/pi-web/components/MessageView.tsx:1176` |
| 时长阈值 | 100ms 以下不显示 | 全部显示 | 满屏 `0ms`，噪声淹没真实耗时 | `ref_projects/pi-web/components/MessageView.tsx:1176` |
| diff 渲染 | 自建两栏（行对齐） | 引入第三方 diff 库 | 新依赖 + 样式体系冲突（不做清单 3） | `ref_projects/pi-web/components/MessageView.tsx:1176` |

### 落点

- `packages/core/src/chat/domain/`：`tool-call.ts`（状态机 running/done/failed）、`patch-diff.ts`（apply_patch 文本 → 文件视角，迁自 `ref_projects/pi-web/components/MessageView.tsx:1578-1593`）
- `packages/web/src/features/chat/`：`tool-call-block.tsx`、`diff/split-diff.tsx`、`diff/patch-text.tsx`
- 文件跳转复用壳的 `onOpenFile`，本能力不直接读文件

## 测试

本规格的验收测试：T-04、T-05、T-06（对应 `behaviors.md` 的脚本，C5 落 `e2e/chat/`；证据 `ref_projects/pi-web/components/MessageView.tsx:1176`）
