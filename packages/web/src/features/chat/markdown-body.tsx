'use client'

/**
 * @design D-S-02
 * 文本渲染：GFM markdown → React 树，**不注入 HTML**。
 *
 * 为什么换掉手写解析器（原来只认段落与围栏代码）：pi-web 的
 * `components/MarkdownBody.tsx:46` 用 `react-markdown` + `remark-gfm` +
 * `rehype-sanitize`，表格/列表/链接/行内代码/删除线都由库负责。
 * 手写版把这些一律当纯文本，视觉上"像但差很多"——这是 C-C 保真差距里
 * 最硬的一条，靠改样式补不回来。
 *
 * 安全边界仍在自己手里：`rehype-sanitize` 的默认 schema 会剥掉脚本、
 * 事件属性与 `javascript:` 链接。渲染器不额外放行原始 HTML（pi-web 的
 * `rehype-raw` 只用于它自己的文档阅读器，聊天消息不走那条路）。
 */
import { type ComponentProps, useCallback, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

/** 超长正文先折叠：一次性解析几万字符会把主线程按住（pi-web `MAX_MARKDOWN_CHARS` 同义） */
export const MAX_MARKDOWN_CHARS = 20_000

/**
 * 只保留"库给不了"的三处定制：链接外开、表格横向滚动（宽表不能撑破气泡）、
 * 围栏代码的语言标签 + 复制按钮。
 *
 * 其余元素一律**不写 className**——排版交给 `globals.css` 里从 pi-web
 * 移植的 `.markdown-body` 段。这是 T-21 的结论：component 里再叠 Tailwind
 * 字号/边距，CSS 与类名会互相打架，最后"看起来像"但读数全不对。
 */
const components: Components = {
  a({ children, href, ...props }: ComponentProps<'a'>) {
    return (
      <a {...props} href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    )
  },
  table({ children }: ComponentProps<'table'>) {
    // 宽表在窄栏里要能横滚，而不是把整条气泡撑宽
    return (
      <div className="my-2 overflow-x-auto">
        <table data-testid="chat-markdown-table">{children}</table>
      </div>
    )
  },
  code({ children, className, ...props }: ComponentProps<'code'>) {
    const text = String(children ?? '')
    const language = className?.replace('language-', '') ?? ''
    // 行内代码没有 language- 类；围栏代码带语言或含换行
    const inline = !className && !text.includes('\n')
    if (inline) {
      return (
        <code {...props} data-testid="chat-inline-code">
          {children}
        </code>
      )
    }
    return <CodeBlock language={language} text={text} />
  },
}

/**
 * 围栏代码的外壳（T-22）：左上语言标签、右上复制按钮、等宽字号、横向滚动。
 *
 * 为什么自己搭而不是引高亮库：pi-web 的聊天正文也没有语法高亮（它只在
 * 文档阅读器里用 `rehype-highlight`），这里多引一个库只会让两侧更难对齐。
 */
function CodeBlock({ language, text }: { language: string; text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 剪贴板不可用（无权限/非安全上下文）：保持按钮可用但文案不变
    }
  }, [text])

  return (
    <div
      data-testid="chat-code-shell"
      className="my-2 overflow-hidden rounded-md border border-border"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
        <span data-testid="chat-code-lang">{language || 'text'}</span>
        <button type="button" onClick={copy} data-testid="chat-code-copy" aria-label="复制代码">
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre
        data-testid="chat-code-block"
        data-language={language || undefined}
        className="overflow-x-auto px-3 py-2"
      >
        <code>{text}</code>
      </pre>
    </div>
  )
}

export function MarkdownBody({ text }: { text: string }): React.JSX.Element {
  if (text.length > MAX_MARKDOWN_CHARS)
    return (
      <pre data-testid="chat-markdown-raw" className="whitespace-pre-wrap break-words text-xs">
        {text}
      </pre>
    )
  return (
    <div data-testid="chat-markdown" className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
