# Penpot MCP — pi 安装说明

> 本文件说明如何在本项目 (`~/evo-pi`) 下连接 Penpot MCP 服务器，以便通过 pi 进行 Penpot 设计协作。

## 安装（MCP URL 由 start-penpot 技能决定）

本地 Penpot 在 `podman-compose` 部署下，**MCP 端点不在 4401**，而是通过前端反向代理暴露：

```text
http://localhost:9001/mcp/sse
```

> 来源：`~/.pi/agent/skills/start-penpot/SKILL.md` — "MCP is internal-only... Local MCP clients reach it via the frontend's `/mcp/sse` and `/mcp/stream` reverse-proxy"。

在 pi 中通过 `mcp` 工具安装：

```text
mcp install http://localhost:9001/mcp/sse
```

> 安装时会立即发起一次 HTTP 验证；**Penpot 未启动时此命令会失败**，先跑 `start-penpot` 技能再装。

## 启动 Penpot

按 `~/.pi/agent/skills/start-penpot/SKILL.md`：

```bash
cd ~/penpot && podman-compose up -d
## 验证前端
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9001/
## 验证 MCP 端点
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9001/mcp/sse
```

> ⚠ Penpot 浏览器中的 **plugin 窗口必须保持打开**，否则 MCP 工具调用会返回 "No plugin instance connected"。

## 验证 MCP 已连接

```text
mcp                          # 列出服务器与工具总数
mcp penpot                   # 列出 penpot 服务器下的工具
```

预期出现 `high_level_overview`、`execute_code`、`export_shape`、`import_image`（仅 local 模式）等。

第一个 Penpot 调用：

```text
mcp penpot high_level_overview
```

返回结构 → 安装成功。

## 配置文件位置（参考）

| 文件 | 用途 |
|---|---|
| `~/.penpot-ai-kit/mcp.generic.json` | `mcpServers`-dialect JSON，URL 已校正为 `http://localhost:9001/mcp/sse` |
| `~/.penpot-ai-kit/dist/penpot-kit.instructions.md` | 可贴入客户端的说明文档 |
| `~/.penpot-ai-kit/install-manifest.json` | 安装清单（本项目下记录为 `generic` 客户端） |

## 卸载 / 重装 MCP

pi 不持久化项目级 MCP 配置；通过 `mcp` 工具管理：

```text
mcp penpot                   # 查看当前状态
mcp penpot —remove           # （伪语法；具体以 pi 工具为准）
```

如需重建：在 Penpot 启动后重新执行 `mcp install http://localhost:9001/mcp/sse`。
