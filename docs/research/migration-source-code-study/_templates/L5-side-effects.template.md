# L5-side-effects.template — 副作用与资源模板

> **何时用**: 完整登记 god 涉及的所有外部 IO / 资源
> **产出大小**: 200-400 行 (表格密集)
> **依赖**: L2 / L4
> **被谁用**: P2 设计 (seam 位置 / adapter 选型) + 测试 (mock 清单)

```markdown
## L5 副作用与资源

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **本文档覆盖**: god 涉及的所有外部 IO + 资源生命周期
---

## 1. localStorage 清单

| key | 写入 concern | 读出 concern | 写时机 | 读时机 | 类型 | 默认值 |
|---|---|---|---|---|---|---|
| `pi-theme` | (外部 hook) | (外部 hook) | user change | mount | string | `system` |
| `pi-sidebar-width` | c01 | c01 | drag commit | mount | number | 280 |
| `pi-quote-selection-enabled` | c03 | c03 | toggle | mount | "true"/"false" | "false" |
| ... | | | | | | |

**重复检测**: 同一 key 跨多个 concern 写 = 风险 (详见 L6)

**SSR 风险**:
- `localStorage.getItem` 在 SSR 抛 → 必须 try/catch 或 useEffect 包裹
- 涉及 concern: <list>
---

## 2. sessionStorage 清单

| key | 写入 concern | 读出 concern | 写时机 | 读时机 | 类型 |
|---|---|---|---|---|---|
| `<key>` | c06 | c06 | selectSession | mount (useLayoutEffect) | string |

**SSR 风险**: sessionStorage 在 SSR 不可用 → **必须**在 useLayoutEffect 中读
---

## 3. URL 操作清单

| URL 参数 | 写入 concern | 读出 concern | 写 API | 读 API |
|---|---|---|---|---|
| `?session=<id>` | c19 | c02 (initial) | `router.replace` | `useSearchParams` |
| `?cwd=<path>` | c05 | c02 (initial) | `router.replace` | `useSearchParams` |
| `?sidebar=collapsed` | c01 | c02 (initial) | `router.replace` | `useSearchParams` |

**SSR 风险**: `router.replace` 在 SSR 无效 → mount 后才生效

**Suspense 风险**: Next.js App Router 下,`router.replace` 在 Suspense 边界内可能触发 remount loop (代码注释明示)
---

## 4. DOM 操作清单

| 元素 | 写入 concern | 操作 | 时机 | 备注 |
|---|---|---|---|---|
| `<html>.class` | (外部 hook) | add/remove | theme change | useTheme 内部 |
| `<html>.dataset.theme` | (外部 hook) | set | theme change | useTheme 内部 |
| `<head><title>` | c14 (or c06) | MutationObserver | 持续监听 | React 19 StrictMode 风险 |
| `document.body.style.cursor` | (外部 hook) | set | drag start/end | useResizablePanel 内部 |
| `document.body.style.userSelect` | (外部 hook) | set | drag start/end | useResizablePanel 内部 |

**严格性**: DOM mutation **不**经过 React 树 → 必须在 useEffect 内部管理 + cleanup
---

## 5. 浏览器 API 清单

| API | 涉及 concern | 权限 | 用法 | cleanup |
|---|---|---|---|---|
| `Notification` | c16 | permission | deliverSessionNotification | n/a |
| `AudioContext` | (useAudio) | n/a (用户手势 unlock) | playDoneSound | ctx.close() (待评估) |
| `matchMedia` | (useIsMobile) | n/a | viewport query | addEventListener / removeEventListener |
| `visualViewport` | (useViewportHeight) | n/a | resize listen | addEventListener / removeEventListener |
| `MutationObserver` | c14 (or c06) | n/a | watch `<title>` | disconnect() (待评估) |
| `BroadcastChannel` | (如有) | n/a | cross-tab sync | close() |
| `Notification` | c16 | permission | push subscription | removeEventListener (待评估) |

**权限门控**:
- Notification: 首次调前 requestPermission,granted/denied 分支处理
- AudioContext: 用户首次手势后 unlock,否则 suspended

**cleanup 审计** (per 宪法 §3.3):
- 每个 addEventListener 必须有 removeEventListener
- 每个 setTimeout 必须 clearTimeout
- 每个 fetch 必须 AbortController 或 cancellation
- 每个 Observer 必须 disconnect
---

## 6. 网络请求清单

| URL pattern | 涉及 concern | 方法 | 频率 | AbortController |
|---|---|---|---|---|
| `/api/sessions` | c04 | GET | mount + refresh | ⚠ 待评估 |
| `/api/sessions/[id]/context` | (c19) | GET | selectSession | ⚠ 待评估 |
| `/api/project/trust` | c08 | POST | user confirm | ⚠ 待评估 |
| ... | | | | |

**竞态风险**:
- 切 session 时,旧 fetch 的 response 可能覆盖新 state → token 防护 (详见 L3 状态机)
- mount 后无 cancel → StrictMode 双调时双 fetch
---

## 7. 资源生命周期总结

| 资源 | 获取时机 | 释放时机 | 失败模式 |
|---|---|---|---|
| AudioContext | useAudio mount | unmount / tab close | ctx.suspended (user gesture 后 unlock) |
| Notification permission | 首次需要时 | n/a (持久) | denied → 静默 |
| localStorage | mount | n/a (持久) | 隐私模式 / quota |
| sessionStorage | mount | tab close | n/a |
| matchMedia listener | mount | unmount (待评估) | 浏览器不支持 |
| MutationObserver | mount | unmount (待评估) | 节点不存在 |
| EventSource / SSE | c16 | unmount | 网络中断 |

**P2 必读**: 每个资源的"获取 + 释放"配对,是 P2 设计 adapter / seam 的依据
---

## 8. 验证清单 (V-*)

- [ ] **V-1**: localStorage 全部 key
  ```

  grep -nE "localStorage\.(get|set)Item" <path>.tsx | grep -oE "'[a-zA-Z0-9-]+'"

```text

  **期望**: <N> 个唯一 key

- [ ] **V-2**: sessionStorage 使用

  ```

  grep -nE "sessionStorage\." <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-3**: Browser API 使用

  ```

  grep -nE "new (Notification|AudioContext|MutationObserver|EventSource|WebSocket)" <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-4**: matchMedia / visualViewport

  ```

  grep -nE "matchMedia|visualViewport" <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-5**: fetch / useEffect 中的 cleanup

  ```

## 检查每个 useEffect 是否有 return () => {...}

  awk '/useEffect/,/^  }, \[' <path>.tsx | grep -c "return ()"

```text

  **期望**: ≥ <N> (使用 effect 数)
---

## 9. Cross-references

- **Reads from**:
  - `../concerns/c*.md` §8 副作用
  - `../cross-cutting/l4-data-flow.md` §5-§6
- **Feeds into**:
  - P2 spec: seam 位置 (哪类副作用放 seam)
  - P3 plan: 测试 mock 清单
  - L6 反模式: cleanup 缺失
  - L7 不变量: 资源生命周期不变量
- **Verifies with**: §8 全部 V-*

```

---

## 模板要点

- **本模板是 P2 设计"seam 选型"的硬依据**——adapter 接口必须覆盖这里列的所有 IO
- **§5 cleanup 审计是强制项**——L1 提到的 22 useEffect 中"待评估"cleanup 在本节收口
- **§7 资源生命周期表**直接被 P2 store 设计消费——每行 → 1 个 store action
- **§8 V-5 cleanup 检查是 P1 质量硬指标**——复现率必须 100%
