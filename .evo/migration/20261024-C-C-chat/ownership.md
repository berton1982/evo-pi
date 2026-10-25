# 行级归属（C-C 会话面）

> 每行必须有归属；`drop` 必须同时出现在 `cut-list.md` 里并写影响。
> 校验：`node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run .evo/migration/20261024-C-C-chat --phase C1`

## 文件：ref_projects/pi-web/components/ChatWindow.tsx

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|
| L1-L94 | D-S-01 | infra |
| L95-L165 | D-U-02 | feature |
| L166-L249 | D-U-03 | feature |
| L250-L700 | D-U-05 | feature |
| L701-L1100 | D-U-06 | feature |
| L1101-L1520 | D-U-07 | feature |
| L1521-L1664 | D-U-08 | feature |
| L1665-L2282 | pi-web 扩展 UI 宿主（本次不迁，见 cut-list） | drop | 扩展 UI 依赖 C-A 未实现的 extension protocol；见 cut-list.md 同范围条目 |

## 文件：ref_projects/pi-web/components/MessageView.tsx

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|
| L1-L159 | D-S-02 | infra |
| L160-L333 | D-U-09 | feature |
| L334-L643 | D-U-10 | feature |
| L644-L992 | D-U-11 | feature |
| L993-L1150 | D-U-12 | feature |
| L1151-L1344 | D-U-13 | feature |
| L1345-L1577 | D-U-14 | feature |
| L1578-L2161 | D-U-15 | feature |

## 切分说明

1. **为什么 `D-U-05/06/07` 三段都属"容器"**：`ChatWindow` 单函数 1270 行，混着三件事——消息列表与滚动位置、输入工具条的 12 个控件状态、notice 与上行回调挂载。三件事的失败模式完全不同（滚错位置 / 参数没生效 / 回调丢事件），必须在 C4 拆成三个 presenter + 各自的 hook，否则它就是第二个 `AppShell`。
2. **`L1665-L2282` 判 drop**：扩展 UI 宿主（`ExtensionDialog` / `ExtensionCustomPanel`）依赖 `useAgentSession` 的 extension protocol，而 `useAgentSession` 由 C-A 迁、当前停在 C4 未实现。迁一半比不迁更糟（用户会看到"扩展请求永远转圈"）。
3. **`MessageView` 的 diff 族（`L1345-L1577`）单独成段**：`SplitPatchView` / `SplitDiffCellView` 是纯展示、零业务，可以最先迁（也最先可测）。
4. **`D-U-09`（L160-L333）夹在中间**：`loadThinkingContent` + token 估算 + `replaceUserMessageText` 三条都不是渲染，属"消息数据整形"，C4 里应落到 domain/use-cases 而不是 presenter——先按源码位置登记，C4 再按职责重排。
5. 本能力**没有** `skeleton` 段：`ChatWindow` 自带视觉，不依赖骨架占位。
