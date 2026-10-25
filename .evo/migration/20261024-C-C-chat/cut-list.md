# 砍单（C-C 会话面）

> 砍单是最容易作弊的归属：「剩下这点不重要」是一句话，不是判据。
> 每行必须写理由与影响；C4 若判定某段其实要迁，回来改这里。

| 原代码 | 范围 | 理由 | 影响 |
|---|---|---|---|
| `ref_projects/pi-web/components/ChatWindow.tsx` | L1665-L2282 | 扩展 UI 宿主（`ExtensionDialog` / `ExtensionCustomPanel`）依赖 `useAgentSession` 的 extension protocol，而 `useAgentSession`（C-A）停在 C4 未实现——迁一半会让扩展请求永远转圈 | 本能力不渲染扩展请求；会话里出现 extension UI 时显示"扩展 UI 暂未支持"的静态提示。C-A 落地后另立 C-C-EXT 补齐 |
