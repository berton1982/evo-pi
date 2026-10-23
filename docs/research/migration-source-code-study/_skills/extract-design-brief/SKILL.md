---
name: extract-design-brief
description: Use when P1 (8-layer source study) of a god component is complete and verified. Extracts a Design Brief per the DESIGN-BRIEF.template.md by reading L1-L8 docs and producing a 200-500 line document with 5+ mermaid diagrams. Outputs `<god>/design-brief.md` ready for P2 spec input.

# Extract Design Brief (P1.5)

After P1 is verified complete, extract a Design Brief per `DESIGN-BRIEF.template.md`. The brief is the **input** to P2 spec, not the spec itself.

The brief's role:

- Crystallize the design proposals from P1 facts
- Show 5+ mermaid diagrams for visual review
- Map L7 invariants to module responsibilities
- Surface L8 improvement suggestions
- Set design quality scorecard

## When to use

Trigger:

- After `verify-p1-completeness` skill reports ✅ PASS
- Before writing P2 spec
- When the god's P1 has many concerns / cross-cutting / state machines (rich enough to merit a brief)

Do NOT use:

- If god is trivial (<200 LOC, <3 concerns, no state machines)
- If P1 is not yet complete

## Inputs

Reads from:

- `<god>/INDEX.md`
- `<god>/static/file-metadata.md` (L1)
- `<god>/concerns/c*.md` (L2)
- `<god>/state-machines/sm-*.md` (L3, if any)
- `<god>/cross-cutting/l4-l8.md` (L4-L8)
- `<god>/coverage-matrix.md`

## Process

### 1. Read all P1 deliverables for the god

Read in this order:

1. INDEX.md (overview + scorecard + linked god)
2. coverage-matrix.md (what's actually covered)
3. L1 static structure (numbers)
4. L2 concerns (business decomposition)
5. L3 state machines (if any)
6. L4 data flow (cross-concern)
7. L5 side effects (IO)
8. L6 anti-patterns (problems)
9. L7 implicit invariants (what to preserve)
10. L8 tech debt (what to improve)

### 2. Generate §1 Metadata (5%, ~25 lines)

From INDEX + L1:

- File path, line count, function count
- Concern count, invariant count, anti-pattern count
- Coverage rate
- Linked god list

### 3. Generate §2 Concern → Module (10%, ~50 lines)

From L2 concerns:

- For each concern, decide: keep in component / extract to store / extract to lib / extract to hook
- Justify each decision with 1 sentence citing L7 I-N

### 4. Generate §3 Contracts (10%, ~50 lines)

From L4 + props + callbacks:

- §3.1 Input props table
- §3.2 Output callbacks table
- §3.3 Internal refs table (target 0)
- §3.4 Side effect contracts (cite L5)

### 5. Generate §4 Component diagram (8%, ~40 lines)

mermaid `graph TB`:

- Parent → ThisGod → Children
- Libs (useI18n, lib/*)
- Hooks (useTheme, useResizablePanel)
- Show actual names from L1

### 6. Generate §5 Data flow diagram (8%, ~40 lines)

mermaid `flowchart LR`:

- Props → state → derived (useMemo) → render
- Side effects → setState
- Callback → parent

### 7. Generate §6 State machine (5%, ~25 lines, optional)

If L3 exists: convert to mermaid `stateDiagram-v2`
If no L3: skip this section, note "本 god 无独立状态机"

### 8. Generate §7 Sequence diagrams (8%, ~40 lines, 1-2 flows)

Pick the 1-2 most important flows from L3/L2:

- e.g. "fetch + cleanup" for ProjectTrustDialog
- e.g. "tree update + ResizeObserver" for BranchNavigator
- mermaid `sequenceDiagram`

### 9. Generate §8 Class/Interface diagram (5%, ~25 lines, optional)

Only if god has clear interfaces (not just functions)

- mermaid `classDiagram`

### 10. Generate §9 Anti-pattern elimination (10%, ~50 lines)

From L6 §4 "反模式 × 重构方向 对照表":

- For each anti-pattern, list: ID / count / severity / elimination method / P2 task ID

### 11. Generate §10 Invariant → Module (10%, ~50 lines)

From L7:

- For each I-N / C-N / A-N / R-N, assign module responsibility
- Use a table with columns: ID / invariant / module / status
- Flag any invariant without module responsibility (P2 must address)

### 12. Generate §11 Improvement suggestions (8%, ~40 lines)

From L8 §3:

- Direct copy of improvement table
- Add a "decision needed" column for P2 spec

### 13. Generate §12 Cross-god assumptions (5%, ~25 lines)

From L7 §3.1.3 (cross-god A-X-N) + INDEX §7 (Linked god):

- Table: A-X-N / assumption / external god / verification location

### 14. Generate §13 Design Quality Scorecard (8%, ~40 lines)

From INDEX §6 (Scorecard) + 9.4 (CONSTITUTION):

- Fill in 12 dimensions
- Compute total score (✅ / 12)
- List top 1-2失分项
- Categorize (clean leaf / middle / god)

### 15. Final review

- Line count must be ≤ 500
- All 5+ mermaid diagrams present
- §10 invariant table must have 100% module responsibility coverage (or flagged)
- §11 improvement table must be present

### 16. Output

Save as `migration-source-code-study/<god>/design-brief.md`

## Output template

The output follows `DESIGN-BRIEF.template.md` exactly. Each section has a target line budget (5%-10% of 500 = 25-50 lines).

## Example

When invoked:
> "extract design brief for branch-navigator"

The skill reads all 9 docs in `branch-navigator/` and produces `branch-navigator/design-brief.md` with:

- §1 metadata (188 lines from INDEX, 191 from L1, etc.)
- §2 3 concerns → recommended forms (c01 pure lib, c02 pure component, c03 smart main)
- §3 11 props + 0 callbacks + 0 refs
- §4 component diagram (3 children + useI18n)
- §5 data flow (11 props → 2 useState + 1 useMemo → 0 callbacks)
- §6 SKIPPED (no state machine)
- §7 sequence: ResizeObserver lifecycle
- §8 SKIPPED (no clear interface)
- §9 0 anti-patterns
- §10 27 invariants → module mapping
- §11 6 improvement suggestions (CSS module + recursive depth + ...)
- §12 5 cross-god assumptions
- §13 11/12 scorecard (clean leaf)

Total: ~400 lines.

## Why this exists

Without a Design Brief, P2 spec writes:

- Re-read all L* docs (slow)
- Risk re-deriving facts from doc fragments
- Lack visual aids (no mermaid)

The brief crystallizes P1's value into a **single, diagram-rich, decision-ready document** that P2 spec writes against.
