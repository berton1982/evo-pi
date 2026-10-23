# Penpot AI Kit — attach me as project instructions

<!-- penpot-ai-kit:begin -->
## Penpot AI Kit — operating rules

This client uses the Penpot AI Kit installed at: /home/berton/.penpot-ai-kit

Before ANY Penpot design work:

1. Read /home/berton/.penpot-ai-kit/AGENTS.md and follow it (tokens-first; never one-shot; Suggest → Apply-with-review; ask before meaningful changes; keep the fill policy in /home/berton/.penpot-ai-kit/shared/modes-and-policies.md).
2. Your FIRST Penpot tool call each session is `high_level_overview` (no arguments).
3. Route the request via /home/berton/.penpot-ai-kit/skills/penpot-router/SKILL.md — choose exactly ONE skill or workflow, then open and follow that skill's SKILL.md.

- Skills:    /home/berton/.penpot-ai-kit/skills/<name>/SKILL.md
- Workflows: /home/berton/.penpot-ai-kit/workflows/<name>/
- Doctrine the skills rely on: /home/berton/.penpot-ai-kit/shared/ and /home/berton/.penpot-ai-kit/policies/ — consult it; never invent Penpot API calls (verify with `penpot_api_info`).

When the user's request is underspecified, open the matching brief template in /home/berton/.penpot-ai-kit/prompts/ (audit-request, component-spec, deck-brief, design-brief, handoff-brief, migration-brief, resume-continuation) and fill it WITH the user before acting. To resume an interrupted multi-phase run, use /home/berton/.penpot-ai-kit/prompts/resume-continuation.md.
<!-- penpot-ai-kit:end -->
