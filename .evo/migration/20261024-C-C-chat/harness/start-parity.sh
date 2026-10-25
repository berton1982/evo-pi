#!/usr/bin/env bash
# 保真双开的共享夹具：两侧进程读同一个 PI_CODING_AGENT_DIR（临时目录，绝不碰 ~/.pi/agent）。
# 为什么必须共享：pi-web 的会话恢复要靠侧栏在 allSessions 里找到那个 id
# （AppShell.tsx:1425 → SessionSidebar.tsx:1140-1155），两侧目录不同时
# 采到的根本不是同一段对话（实测相差 6KB 就足够让覆盖率归零）。
set -euo pipefail
AGENT=${AGENT:-/tmp/parity-agent}
CWD=${PARITY_CWD:-/home/berton/evo-pi}
SLUG="--$(printf '%s' "$CWD" | sed 's#^/##; s#/#-#g')--"
SRC=${SRC:-/tmp/e2e-agent/sessions/$SLUG}
mkdir -p "$AGENT/sessions/$SLUG"
cp "$SRC"/01jclongsession0000000000001.jsonl "$AGENT/sessions/$SLUG/" 2>/dev/null || true
echo "夹具目录：$AGENT（会话：$(ls "$AGENT/sessions/$SLUG" | tr '\n' ' ')）"
