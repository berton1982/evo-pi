# 文件

- [HTTP API 层：三个 route handler 的接线与错误映射](api-routes.md) - 说明 /api/sessions、/api/sessions/[id]/context、/api/sessions/search 三个 Route Handler 的模块级接线、SDK Date 与 wire DTO 的双向映射与两侧 zod 校验、参数处理（tail / before / leafId / q），以及领域错误到 HTTP 状态码的映射规则。
- [应用外壳：三区布局、Provider 栈与面板状态](app-shell.md) - 说明 AppProviders 的 Provider 嵌套顺序（theme → i18n → react-query）及其理由、react-resizable-panels v4 下用 PanelImperativeHandle 命令式同步折叠状态的做法、三区面板的尺寸约束，以及 /sessions 页面如何组装各 slot 并把选中会话同步到 URL。
- [客户端数据获取：api-client、react-query hooks 与 URL 选中态](data-fetching.md) - 说明浏览器侧取数链路——fetchApi 与 ApiError 的 status=0 语义、三个 react-query hook 的 queryKey 与 staleTime / retry / enabled 策略、客户端二次 zod 校验与 Date 反向映射，以及选中会话以 URL query 为唯一真值源的同步方式。
- [表现层基础设施：自实现 i18n、主题与 shadcn/Tailwind 配置](i18n-and-theme.md) - 说明自实现 i18n 的三层结构（locale 注册表、三级翻译回退与 {name} 插值、浏览器语言解析与 localStorage 持久化）、首帧避免 hydration mismatch 的策略、next-themes 主题 store 的接线，以及 components.json 与 globals.css 构成的 shadcn + Tailwind v4 token 基础。
- [Session 浏览 UI：虚拟列表、搜索过滤与消息渲染](session-browsing-ui.md) - 说明 Sidebar → SessionTree → SessionTreeRow 的虚拟化渲染契约（54px 行高、overscan 由像素换算为条数、空态）、搜索以“过滤已有列表”而非内联结果生效的语义、CenterZone 的三态机，以及 MessageView 与 e2e/单测共享的 DOM 属性契约。
