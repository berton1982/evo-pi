# 文件

- [开发工作流：命令面、任务图、Git hook 与 CI](developer-workflow.md) - 汇总 evo-pi 的日常命令与自动化边界——turbo 任务图与跨包调度约定、biome 单二进制的 lint/format 规则与排除范围、changesets 版本流程、husky + lint-staged 提交拦截，以及 changesets 与 openwiki-update 两个 GitHub Actions workflow 的触发条件与权限。
- [本地隔离纪律：端口、agentDir 与不写 live 数据](local-isolation-and-live-data.md) - 把本机开发最关键的操作契约落到代码事实上——evo-pi 只用 30041 而 pi-web 的 30141 绝不触碰、kill 必须按端口或 PID 精确匹配、以及 core 在未覆盖 PI_CODING_AGENT_DIR 时会写真实 ~/.pi/agent 的具体代码路径与规避方式。
