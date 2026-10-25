'use client'

import type { KeyboardEvent, PointerEvent } from 'react'

/**
 * 分隔条（壳级）：拖拽 + 方向键调整相邻区域尺寸。
 *
 * 为什么自己写而不复用 react-resizable-panels：那个库只管"横向三栏"，
 * 文件区内部的上下分割是嵌套在能力槽位里的，用同一库会引入第二套 group 语义；
 * 这里只需要"一条可拖可键盘操作的分隔条"，40 行比一个新依赖便宜。
 *
 * 读屏：`role="separator"` + `aria-orientation` + `aria-valuenow` 是 WAI-ARIA
 * 对可调整分隔条的定义；方向键 ±8px（Home/End 到边界）。
 */
export function ResizeHandle({
  label,
  orientation,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  orientation: 'horizontal' | 'vertical'
  /** 当前值（px），用于 aria-valuenow */
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}): React.JSX.Element {
  const clamp = (n: number): number => Math.min(max, Math.max(min, n))

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const step = 8
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(clamp(value - step))
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(clamp(value + step))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(min)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(max)
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const startY = e.clientY
    const start = value
    e.currentTarget.setPointerCapture(e.pointerId)
    function onMove(ev: globalThis.PointerEvent): void {
      // 向上拖 = 区域变高（clientY 变小 → start - dy），方向与视觉一致
      onChange(clamp(start - (ev.clientY - startY)))
    }
    function onUp(): void {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const horizontal = orientation === 'horizontal'

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      data-component="resize-handle"
      className={
        horizontal
          ? 'hover:bg-accent focus-visible:bg-accent h-1 shrink-0 cursor-row-resize'
          : 'hover:bg-accent focus-visible:bg-accent w-1 shrink-0 cursor-col-resize'
      }
    />
  )
}
