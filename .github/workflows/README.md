# GitHub Workflows

This directory holds GitHub Actions workflows for evo-pi. They run on
[Github-hosted runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
or self-hosted runners configured per repo.

## Active workflows

### `changesets.yml` (T03b, #7)

Runs [`@changesets/action@v2`](https://github.com/changesets/action) on every
PR to this repo. When a PR contains `.changeset/*.md` files, the action:

1. Checks out the repo at the PR head (full history)
2. Installs pnpm + dependencies (`pnpm install --frozen-lockfile`)
3. Runs the configured `version-script` (`pnpm exec changeset version`) to
   consume changesets and bump versions
4. Commits the version changes back to the **PR branch** (not main)

> **Note on action version**: `@changesets/action@v1` is for Changesets CLI v2;
> `@changesets/action@v2` is for Changesets CLI v3. evo-pi uses CLI ^3.0.3 (T03a),
> so this workflow pins `v2`. Input API also changed: v1 used `publish` /
> `version`; v2 uses `publish-script` / `version-script` (see
> [action docs](https://github.com/changesets/action#api)).

When the PR is later merged into `main`, a follow-up changesets workflow
(not yet added) will create a "Version Packages" PR aggregating
all pending bumps from merged changesets.

#### Triggers

- `pull_request` opened
- `pull_request` reopened
- `pull_request` synchronize (new commits pushed)

#### Permissions

- `contents: write` — commit version changes to PR branch
- `pull-requests: write` — comment on the PR

#### Manual trigger

There is **no** `workflow_dispatch` trigger on this workflow (it doesn't make
sense to "re-run version" outside a PR context). To manually verify the
workflow file is syntactically valid:

```sh
## 1. From a local checkout with this branch
gh workflow view .github/workflows/changesets.yml

## 2. Or use act (https://nektosact.com/) once installed:
act -l  # list detected workflows
```

For local action dry-run without `act`, validate the YAML schema manually
or with `actionlint` (TBD in a future ticket).

#### Debugging

- Failed runs post logs in the PR's "Checks" section
- Add `ACTIONS_STEP_DEBUG: true` in the env block to enable step-level logs
- The action publishes logs with prefix `__changesets-action__`

#### evo-pi specifics

- pnpm version is pinned to `9.15.0` (matches `package.json:packageManager`)
- Node.js is pinned to `v22` (matches `package.json:engines.node >=22.19.0`)
- `access: restricted` in `.changeset/config.json` skips publish; once P5+
  introduces publishable packages, update the `publish-script` step input

## Adding new workflows

When adding a workflow:

1. Follow the same structure: detailed top-of-file comment block
   (trigger + expected output + permissions + rationale)
2. Pin third-party action SHAs (`uses: owner/action@<full-sha>`) for security;
   the `@vN` (major-version tag) style in this file is acceptable for P0
   scaffold but should be tightened to full SHA before any production rollout
3. Add a `### <name>` section to this README documenting the workflow
4. Add a corresponding GitHub Issue with `ready-for-agent` label (or
   follow-up for post-P0 work)
