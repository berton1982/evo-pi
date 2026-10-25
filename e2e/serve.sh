#!/usr/bin/env bash
# 起一个"能被 e2e 驱动"的 evo-pi：构建期必须带 NEXT_PUBLIC_E2E_FAKE_TRANSPORT=1，
# 否则运行态用例（排队/引导/追加/压缩）全部超时——这个常量是构建期内联的，
# 不是运行时读的，所以只在 build 时设置才有效（实测踩过一次：重建漏了它，9 条用例红）。
set -euo pipefail
AGENT=${PI_CODING_AGENT_DIR:-/tmp/e2e-agent}
PORT=${PORT:-30041}
cd "$(dirname "$0")/../packages/web"
NEXT_PUBLIC_E2E_FAKE_TRANSPORT=1 npx --no-install next build
# 运行态用例（排队/引导/追加）需要"跑得够久"：假传输默认瞬时完成，
# 队列还没形成就结束了。这个延迟只在 e2e 服务里设，不影响真实运行时。
PI_CODING_AGENT_DIR="$AGENT" AGENT_FAKE_DELAY_MS="${AGENT_FAKE_DELAY_MS:-1200}" \
  npx --no-install next start -p "$PORT"
