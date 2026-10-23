# 文件

- [端到端测试：Playwright 配置、用例与运行前置条件](e2e-playwright.md) - 说明 playwright.config.ts 的关键取舍——testDir 指向根 e2e/、复用系统 Chrome 而非下载浏览器、baseURL 默认 30041、webServer 段被注释掉因此不会自动拉起 dev server——以及三个 spec 依赖的 data-* DOM 契约与“磁盘无会话则 skip”的模式。
- [单元与集成测试：vitest 单根配置、覆盖范围与当前失败项](unit-tests.md) - 说明根 vitest.config.ts 的 single-root 策略与环境切换方式、web test-setup 的 polyfill 职责、测试分层结构与性能预算，并如实记录当前 pnpm test 的真实结果——327 个用例中 5 个失败加 1 个性能用例抖动的成因与已验证修法。
