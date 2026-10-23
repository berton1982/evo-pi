---
name: verify-p1-completeness
description: Use when P1 (8-layer source study) of a god component is claimed done. Runs automated checks on V-* command reproduction rate, cross-reference closure, coverage matrix completeness, and L7 invariant → module responsibility mapping. Outputs a pass/fail report with specific issues to fix before P1.5 (Design Brief).

# Verify P1 Completeness

P1 (8-layer source study) is claimed done for a god component. Before proceeding to P1.5 (Design Brief) or P2 (Spec), run this skill to verify the P1 deliverables are actually complete and trustworthy.

This skill prevents two failure modes:

1. **Hallucination**: AI documents state things that aren't in the source code
2. **Omission**: AI skips source code regions without documenting them

## When to use

Trigger this skill:

- After claiming "P1 is done" for a god
- Before starting P1.5 Design Brief
- Before starting P2 Spec
- Any time you suspect P1 docs are stale or incomplete

Do NOT use this skill:

- During P1 itself (this is for verification, not authoring)
- For P2/P3 artifacts

## Inputs

The skill reads:

- `<god>/INDEX.md` — should exist and reference all L1-L8 docs
- `<god>/static/file-metadata.md` (L1)
- `<god>/concerns/c*.md` (L2)
- `<god>/state-machines/sm-*.md` (L3, if any)
- `<god>/cross-cutting/l4-l8.md` (L4-L8)
- `<god>/coverage-matrix.md` (must exist post-v1.2)

## Process

### 1. Read the god's INDEX.md

Extract:

- File path, line count, function count
- All concerns (c01-cNN) and their files
- All state machines and cross-cutting docs
- Reading modes (Quick scan / Standard dive / Full audit)
- V-* reproduction rate claim

### 2. Read the coverage matrix

Verify:

- All source code lines are covered by some block
- Each block is referenced by at least one L* doc
- No un-referenced blocks (or un-referenced blocks are just comments/blank)

### 3. For each L* doc, verify

#### 3.1 V-* commands

- Each V-* has an actual bash command (not just description)
- Each command uses the v1.1 corrected patterns (`^[[:space:]]*`, assignment line)
- Each command doesn't chain with `&&` (use `;` or independent)
- The "expected" output is a specific number, not "approximately"

#### 3.2 Cross-references

- §11 "Cross-references" exists in each doc
- Lists: Reads from / Feeds into / Verifies with
- All "Feeds into" targets actually exist (run `ls` to verify)

#### 3.3 Source line citations

- Every claim like "L<line> is X" should be valid
- Pick 10 random line citations and verify with `sed -n '<line>p' <source>`

### 4. Verify L7 → module responsibility

For each I-N / C-N / A-N / R-N in L7:

- Must have a "module responsibility" or "P2 task" assigned
- If "parent" or "external god": must have cross-god reference

### 5. Verify L8 completeness

For L8:

- §1 "current tech stack" populated from L1
- §2 "missing items" lists at least 1 issue (or explicitly "0 missing")
- §3 "improvement suggestions" has at least 1 row (or "no improvements needed")

### 6. Output a report

Output format (mark each ✅/⚠/❌):

```markdown
## P1 Completeness Report — <God>

## 1. Coverage (Coverage Matrix §2)
- Total lines: <N>
- Covered blocks: <N>
- Coverage rate: <pct>%
- Status: ✅ / ⚠ / ❌

## 2. V-* Reproduction (INDEX §5)
- Total V-* commands: <N>
- Executable: <N>
- Reproduction rate: <pct>%
- Status: ✅ / ⚠ / ❌

## 3. Cross-Reference Closure
- Total cross-refs: <N>
- Closed (target exists): <N>
- Dangling refs: <list>
- Status: ✅ / ⚠ / ❌

## 4. Source Line Citation Accuracy
- Sampled citations: 10
- Accurate: <N>
- Hallucination rate: <pct>%
- Status: ✅ / ⚠ / ❌

## 5. L7 → Module Responsibility
- Total invariants (I+C+A+R): <N>
- With module responsibility: <N> / <N>
- Status: ✅ / ⚠ / ❌

## 6. L8 Completeness
- §1 current stack: ✅ / ⚠ / ❌
- §2 missing items: ✅ / ⚠ / ❌
- §3 improvement suggestions: ✅ / ⚠ / ❌
- Status: ✅ / ⚠ / ❌

## 7. INDEX §6 Design Quality Scorecard
- Filled: ✅ / ⚠ / ❌
- Total score: <N> / 12

## 8. INDEX §7 Linked god
- Filled: ✅ / ⚠ / ❌
- Cross-god A-X-N documented: ✅ / ⚠ / ❌

## Overall Verdict
- ✅ PASS: All 8 sections pass → proceed to P1.5
- ⚠ FIXABLE: 1-2 sections fail with specific issues → fix and re-verify
- ❌ REWORK: ≥3 sections fail → redo P1
```

## Example usage

When invoked:
> "verify p1 for project-trust-dialog"

The skill reads:

- `migration-source-code-study/project-trust-dialog/INDEX.md`
- All L1-L8 docs
- `coverage-matrix.md`

And outputs a completeness report. If sections fail, list specific issues:

- "V-3 in static/file-metadata.md uses `^  const` (2-space) — needs v1.1 fix"
- "L7 has 5 A-N with no module responsibility — P2 spec must address"
- "coverage-matrix.md is missing — create it first"

## Why this exists

Without verification, P1 deliverables are:

- Easy to claim "done" while still missing pieces
- Prone to AI hallucination (confident wrong claims)
- Hard to trust as input to P1.5 / P2

This skill is the gate that makes P1 trustworthy. Run it before moving to higher phases.
