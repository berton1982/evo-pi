# 时序 S-02：工具结果到 diff（跨边界）

参与者：C-04（工具块）、P-C-03（文件打开）、D-B-05（patch 解析）。

1. `tool_execution_end` → C-04 按 `toolCallId` 绑定结果
2. 若工具为 `apply_patch` → C-04 调 D-B-05 解析
3. 解析成功 → 渲染两栏 diff；点击文件行 → P-C-03 打开文件
4. 解析失败 → 降级纯文本 patch，保留原文
