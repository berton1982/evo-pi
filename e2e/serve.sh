#!/usr/bin/env bash
# 起一个"能被 e2e 驱动"的 evo-pi：构建期不再需要 NEXT_PUBLIC_E2E_FAKE_TRANSPORT（in-page 假传输已移除，全部走 HTTP SSE）
# 否则运行态用例（排队/引导/追加/压缩）全部超时——这个常量是构建期内联的，
# 不是运行时读的，所以只在 build 时设置才有效（实测踩过一次：重建漏了它，9 条用例红）。
set -euo pipefail
AGENT=${PI_CODING_AGENT_DIR:-/tmp/e2e-agent}
PORT=${PORT:-30041}
cd "$(dirname "$0")/.."
# 夹具是生成物，不是手放的：`/tmp` 被清过之后 20+ 条用例会一起红，
# 而红的样子像渲染回归（踩过一次，查了两小时）。所以起服务前先确保它在。
node e2e/fixtures/ensure-chat-session.mjs "$AGENT" >/dev/null
node e2e/fixtures/ensure-long-session.mjs "$AGENT" >/dev/null
cd packages/web
npx --no-install next build
# 运行态用例（排队/引导/追加）需要"跑得够久"：假传输默认瞬时完成，
# 队列还没形成就结束了。这个延迟只在 e2e 服务里设，不影响真实运行时。
# 250ms：一轮 5 个事件 ≈1.2s，既留出"运行中"窗口给排队用例，
# 又不会让 40+ 条 e2e 每条都等 6 秒（1200ms 时整套要跑十几分钟）。
PI_CODING_AGENT_DIR="$AGENT" AGENT_FAKE_DELAY_MS="${AGENT_FAKE_DELAY_MS:-250}" \
  npx --no-install next start -p "$PORT"
