---
name: verify-p2-bridge
description: Use after P2 spec is written for a god. Verifies that the spec properly addresses every L7 invariant (with module responsibility), every L6 anti-pattern (with elimination plan), every L8 improvement (with accept/reject decision), and every cross-god assumption (with dependency plan). Outputs a pass/fail report before P3 plan.

# Verify P2 Bridge

After P2 spec is written, verify it properly bridges from P1 (L1-L8) + P1.5 (Design Brief). The spec must:

- Address every L7 invariant (no orphan invariants)
- Eliminate every L6 anti-pattern (or document why kept)
- Decide on every L8 improvement (accept or reject with reason)
- Handle every cross-god assumption (with dependency plan)

Without this verification, P2 specs can be:

- Internally consistent but not covering P1's full findings
- "Decision-shaped" but missing the actual decisions
- Missing cross-god coordination

## When to use

Trigger:

- After P2 spec is written
- Before starting P3 plan
- When user asks "is the P2 spec done?"

Do NOT use:

- For P3 plan validation (use writing-plans skill)
- For implementation verification (use code-review skill)

## Inputs

Reads:

- `<god>/INDEX.md`
- `<god>/design-brief.md` (P1.5)
- `<spec-doc>` — path to P2 spec, e.g. `docs/superpowers/specs/2026-10-12-project-trust-dialog-design.md`
- Optionally: all P1 L* docs (for cross-check)

## Process

### 1. Read P2 spec

Identify sections that should map to P1:

- "不变量映射" / "invariant mapping"
- "重构必消除" / "refactor must-eliminate"
- "技术决策" / "tech decisions" (for L8)
- "跨组件契约" / "cross-component contract" (for linked god)

### 2. Read P1.5 Design Brief

Extract from brief:

- §10 invariant → module table (golden reference)
- §9 anti-pattern elimination list
- §11 improvement suggestions
- §12 cross-god assumptions

### 3. Cross-check L7 invariants

For each I-N / C-N / A-N / R-N in P1.5 §10:

- Does P2 spec assign a module responsibility?
- If P1.5 said "assigned to module X" and P2 spec says different → flag

Output:

- ✅ All invariants have module responsibility in P2
- ⚠ Some invariants unaddressed
- ❌ Major gaps

### 4. Cross-check L6 anti-patterns

For each anti-pattern in P1.5 §9:

- Does P2 spec have a "必消除" task?
- If P1.5 said "必消除" and P2 spec doesn't → flag

Output:

- ✅ All必消除 in P2
- ⚠ Some are documented but no P3 task
- ❌ Major anti-patterns unaddressed

### 5. Cross-check L8 improvements

For each improvement in P1.5 §11:

- Does P2 spec have an "accept" or "reject" decision?
- If rejected, is the reason documented?

Output:

- ✅ All improvements decided
- ⚠ Some pending
- ❌ Improvements unaddressed

### 6. Cross-check cross-god assumptions

For each A-X-N in P1.5 §12:

- Does P2 spec describe how to handle? (e.g. "wait for useAgentSession P1", "add integration test", etc.)
- If dependency god is not P1'd yet → spec should say "blocked until X"

Output:

- ✅ All cross-god handled
- ⚠ Some pending decision
- ❌ Major dependencies unaddressed

### 7. Check spec structure

P2 spec should have (per brainstorming skill):

- Intent & why
- Goals / non-goals / anti-goals
- Constraints
- Parts decided
- Left to builder

If missing → flag.

### 8. Output report

```markdown
## P2 Bridge Report — <God>

## 1. L7 Invariant Coverage
- Total invariants: <N>
- With module responsibility in P2: <N> / <N>
- Orphan invariants: <list>
- Status: ✅ / ⚠ / ❌

## 2. L6 Anti-pattern Coverage
- Total anti-patterns: <N>
- With "must eliminate" task in P2: <N> / <N>
- Unaddressed: <list>
- Status: ✅ / ⚠ / ❌

## 3. L8 Improvement Decisions
- Total improvements: <N>
- Accepted in P2: <N>
- Rejected with reason: <N>
- Pending: <N>
- Status: ✅ / ⚠ / ❌

## 4. Cross-god Assumption Handling
- Total A-X-N: <N>
- Handled in P2 (wait / integrate / explicit): <N>
- Unaddressed: <list>
- Status: ✅ / ⚠ / ❌

## 5. Spec Structure (per brainstorming skill)
- Intent & why: ✅ / ⚠ / ❌
- Goals: ✅ / ⚠ / ❌
- Non-goals: ✅ / ⚠ / ❌
- Anti-goals: ✅ / ⚠ / ❌
- Constraints: ✅ / ⚠ / ❌
- Parts decided: ✅ / ⚠ / ❌
- Left to builder: ✅ / ⚠ / ❌

## 6. P3 Plan Readiness
- P2 spec is sufficient for P3 plan? ✅ / ⚠ / ❌
- Specific gaps blocking P3: <list>

## Overall Verdict
- ✅ PASS: All 6 sections pass → proceed to P3 plan
- ⚠ FIXABLE: 1-2 sections need patching → fix in P2
- ❌ REWORK: P2 spec needs major revision
```

## Example

When invoked:
> "verify p2 bridge for project-trust-dialog"

The skill reads:

- `migration-source-code-study/project-trust-dialog/design-brief.md` (P1.5)
- `docs/superpowers/specs/2026-10-12-project-trust-dialog-design.md` (P2)

And outputs a bridge report. If gaps:

- "L7 I-3 (loading → loaded only via fetch 200) is unaddressed in P2"
- "L6 R-2 (5 e2e gaps) is mentioned but no P3 task created"
- "A-X-1 (lib `openStackedDialog` cleanup) is referenced in P2 but not validated"

## Why this exists

Without bridge verification, P2 specs can pass code-review (internally consistent) but miss P1's actual findings. The spec becomes "polished" but "incomplete" — dangerous for downstream P3 plans.

This skill is the gate between P2 (decision) and P3 (execution).
