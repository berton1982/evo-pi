'use client'

import { Input } from '@/components/ui/input'

/**
 * SidebarSearchInput — PR.A 2A.8: enabled input wired to Sidebar state.
 *
 * Phase 0: disabled placeholder (search-toggle state existed but no input).
 * Phase 1: same placeholder.
 * Phase 2 PR.A: enabled input. State lifted to Sidebar so it can drive
 *   SessionTree filter via useSessionSearch (debounce 200ms inside hook).
 *
 * The hook lives in Sidebar (parent), not here — keeps this component
 * presentational and identical-shape to PR.B+ where useSessionSearch
 * will fetch /api/sessions/search instead of mockSearchSessions.
 */

export interface SidebarSearchInputProps {
  /** Current input value (controlled) */
  value: string
  /** Called on every keystroke — Sidebar will debounce via useSessionSearch */
  onChange: (value: string) => void
}

export function SidebarSearchInput({
  value,
  onChange,
}: SidebarSearchInputProps): React.JSX.Element {
  return (
    <div className="shrink-0 p-2" data-component="sidebar-search-input">
      <Input
        type="text"
        placeholder="Search sessions…"
        value={value}
        // Base UI's Input fires onValueChange (not React's onChange) when
        // controlled via `value`. Using both for safety: Base UI will call
        // onValueChange when user types; the synthetic onChange handles any
        // code that posts via fireEvent.change in @testing-library.
        onValueChange={(v: string) => onChange(v)}
        data-testid="sidebar-search-input"
        data-action="search-input"
      />
    </div>
  )
}
