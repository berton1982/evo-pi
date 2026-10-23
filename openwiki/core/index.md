# 文件

- [Clean Architecture 四层落地：目录、端口与依赖规则](clean-architecture-layers.md) - 说明 evo-pi 如何把 ADR 0003 与 Architecture 0001 的四层 + ports-in-domain 规则映射到 packages/core/src 的真实目录，说明每层职责与依赖方向、web 作为最外层的接线方式，以及规范文本与当前实现之间的三处偏离。
- [session capability：领域模型、端口与读侧用例](session-capability.md) - 说明 session capability 的三个端口契约、六个 factory 式读侧用例与 JsonlSessionRepository 的编排算法，并记录几处实现与端口注释不一致的真实行为（全 agentDir 扫描、缓存不短路读盘、searchSessions 走独立全量扫描）。
- [session 搜索：ponytail 扫描算法、上限与截断语义](session-search.md) - 端到端描述 session 搜索的实现——候选集来源、modified 倒序、逐行 JSONL 正则匹配、每个会话首个命中即停、snippet 拼接规则，并区分注释里声明的上限与代码真正实现的上限。
- [存储适配与 scan-index：指纹缓存、持久化与 id 反查](session-storage-and-scan-index.md) - 说明 FileSystemSessionStorage 如何借 SDK 组装 SessionInfo、scan-index 的三层结构（内存缓存 / 落盘格式 / debounce 写盘）与淘汰规则、evo-pi-session-index.json 的版本与冷重建契约，以及 getSessionFileForId 反查的真实代价与尚未接线的 SmCache / bounded-reader。
- [system capability：配置快照、项目信任与 agentDir 解析](system-capability.md) - 说明 system capability 的两个端口与 in-memory adapter 的实际行为——agentDir 的三级解析顺序、getConfig 每次重算 process.cwd() 而 web route 却把它冻结为常量、以及 checkTrust 恒为 true 导致 403 分支目前不可达。
