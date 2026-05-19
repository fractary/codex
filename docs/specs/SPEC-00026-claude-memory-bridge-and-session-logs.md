# Memory portability + session log backup — codex bridge + S3

## Context

You have a multi-machine, multi-project workflow that's currently constrained by the local-only nature of Claude Code's built-in auto-memory. The good news: this is **not a new Claude Code feature** — auto-memory has always been machine-local, file-based at `~/.claude/projects/<encoded-abs-path>/memory/`. The bad news: it's path-keyed by your absolute project location, so even if you rsync the directory verbatim to another machine, it won't be found unless the project sits at the same path on both machines.

You already have a sophisticated cross-machine sync infrastructure in place — the fractary-codex plugin syncs `.fractary/codex/memory/` and other paths to/from a central `corthosai/codex.corthos.ai` repo. As of today that repo has 12 project subfolders (`api.corthodex.ai`, `core.corthodex.ai`, `etl.corthion.ai`, `lake.corthonomy.ai`, `press.corthography.ai`, ...). The fractary-codex plugin even has a `fractary-codex-memory-create` skill that writes structured memories to `.fractary/codex/memory/{type}/{id}.md` — exactly the use case you want.

The auto-memory entries we created today (8 of them in `~/.claude/projects/-home-ubuntu-GitHub-corthos-core-corthodex-ai/memory/`) are stuck on this machine. The codex memories in `.fractary/codex/memory/` are not — they sync everywhere via the existing infrastructure.

This plan covers three things:
1. **Memory portability** — bridge Claude Code's auto-memory into codex so it survives machine changes and is shareable across projects.
2. **Session log backup** — push `*.jsonl` session transcripts to S3 so they're durable and searchable later.
3. **Cross-project memory access** — leverage the existing codex `from_codex` include patterns + a new shared org-level path.

## Recommended approach

### Use the codex model as the durable home for memory; treat Claude Code's auto-memory as ephemeral scratch.

Reasoning:
- Codex already solves cross-machine, cross-project, and version-control concerns. Adding a second sync layer would duplicate effort.
- Auto-memory's path-keyed dir + simple frontmatter is a UX layer (good for "save this insight quickly"), not a storage layer. The right model is to PROMOTE entries from auto-memory into codex.
- Codex memories live in the project repo at `.fractary/codex/memory/`, are committed with the rest of the project artifacts, and sync to the central `codex.corthos.ai` repo via `fractary-codex sync`.

### Two concrete pieces (was three — `_shared/` folder dropped per your feedback)

**(1) Auto-memory ⇄ codex bridge.** A small wrapper (skill + hooks) that mirrors files between Claude Code's path-keyed auto-memory dir and the project-tracked `.fractary/codex/memory/auto/` location. Direction:
- `push` — `~/.claude/projects/<encoded>/memory/*.md` → `<project>/.fractary/codex/memory/auto/*.md`
- `pull` — `<project>/.fractary/codex/memory/auto/*.md` + any CROSS-PROJECT memories the project's `from_codex.include` chose to fetch (e.g. from `.fractary/codex/cache/projects/<other-project>/.fractary/codex/memory/`) → `~/.claude/projects/<encoded>/memory/*.md`

Run `push` on `Stop` / `SessionEnd`; run `pull` on `SessionStart`. Combined with the existing `fractary-codex sync` (which moves files between the project repo and the central `corthosai/codex.corthos.ai` repo), this gives:
- Each session's auto-memory entries land in the project repo (committed) and the central codex repo.
- A fresh machine, after `git clone <project> && fractary-codex sync from-codex && claude-code` (with SessionStart hook firing), sees all prior auto-memory entries from any machine.
- Cross-project memories that this project's `from_codex.include` pulls into the local codex cache are visible inside Claude Code's auto-memory loader without any extra config — the bridge skill copies them in.

**(2) Session logs → S3.** A `Stop` / `SessionEnd` hook that uploads the just-finished `~/.claude/projects/<encoded>/<session-id>.jsonl` to `s3://<your-bucket>/sessions/<machine-name>/<org>/<project>/<YYYY>/<MM>/<DD>/<session-id>.jsonl`. Bucket has a lifecycle policy: STANDARD → STANDARD-IA at 30 days → Glacier Deep Archive at 90 days. Session logs are large but compress well; per-month-per-active-machine costs should be cents.

### Cross-project memory access — no new folder needed

Your existing codex sync model already handles this. Each project's `.fractary/config.yaml` has a `from_codex.include` list that explicitly enumerates which paths from OTHER projects to pull. For example, `core.corthodex.ai` already pulls:
```yaml
from_codex:
  include:
    - codex://corthosai/codex.corthos.ai/.fractary/codex/memory/**       # the codex-of-codex repo's own memories
    - codex://corthosai/lake.corthonomy.ai/docs/schema/**                # schemas from another project
    - codex://corthosai/lake.corthonomy.ai/docs/guides/**
```

To pull memories from other projects, simply add their memory paths:
```yaml
from_codex:
  include:
    - codex://corthosai/<other-project>/.fractary/codex/memory/**
```

The bridge skill (above) handles surfacing those pulled files into Claude Code's auto-memory loader at session start. No `_shared/` folder, no convention split between "project-local" and "shared" — every memory lives in ITS HOME project's `.fractary/codex/memory/` and is selectively imported by other projects via their `from_codex.include`.

## What Claude Code provides (and doesn't) for memory configuration

I checked the Claude Code settings schema (`https://www.schemastore.org/claude-code-settings.json`). Findings:

- **`autoMemoryEnabled`** (boolean, default `true`) — controls whether Claude Code auto-saves memories at all. Can also be toggled via env var `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.
- **`claudeMdExcludes`** (glob array) — patterns of CLAUDE.md files to EXCLUDE from auto-loading at session start. (Inclusion-by-default with explicit excludes; useful in monorepos.)
- **`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`** (env var) — semicolon-or-colon-separated list of additional directories from which Claude Code should load `CLAUDE.md` files at session start. This is the SECOND-best mechanism (after the bridge skill) for surfacing cross-project context.
- **NO setting for the auto-memory directory location.** The location is hardcoded to `~/.claude/projects/<encoded-abs-path>/memory/` and there's no way to redirect it. This is the reason we need a bridge skill rather than a config tweak.

So three valid mechanisms exist for cross-project memory visibility (pick one or combine):

| Mechanism | What it does | Pros | Cons |
|---|---|---|---|
| **Bridge skill (recommended)** | Copies pulled codex memory files into `~/.claude/projects/<encoded>/memory/` on `SessionStart` | Uses Claude Code's native auto-memory loader; no special config; survives renames | Requires the bridge skill + hooks; brief sync window at session start |
| **`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` env var** | Loads CLAUDE.md from listed dirs at session start | No bridge skill needed | Loads only `CLAUDE.md` (not individual memory `.md` files); env-var management across machines |
| **References inside the project's own CLAUDE.md** | The project's main CLAUDE.md contains a section linking to pulled memory files | Zero infra; pure markdown convention | Manual — you have to remember to add references; Claude reads CLAUDE.md and follows references on demand |

**Recommendation: bridge skill** (Part A below). It's the only mechanism that surfaces cross-project memories WITHOUT requiring per-memory references in CLAUDE.md or env-var tweaks per machine.

## Implementation outline

### Part A — Memory bridge (~1 hour of work)

**A.1. New skill `fractary-codex-auto-memory-sync`** under `~/.claude/plugins/marketplaces/fractary-codex/plugins/codex/skills/`. Two operations:

- `push` — read every `*.md` in `~/.claude/projects/<encoded>/memory/`, normalize the frontmatter (auto-memory's `name`/`type` → codex's `id`/`type`), write to `<project-root>/.fractary/codex/memory/auto/<slug>.md`.
- `pull` — reverse: read every `.fractary/codex/memory/auto/*.md` from the project root, write to the auto-memory dir at the right path-encoded location for THIS machine. Used on a new machine to bootstrap.

Both operations idempotent and content-hash gated so unchanged files don't churn the codex repo.

**A.2. Hook integration.**
- `SessionStart` hook (in `.claude/settings.json`): invoke `fractary-codex-auto-memory-sync pull` so the auto-memory dir is hydrated from the project's `.fractary/codex/memory/auto/` (which itself was synced from codex by the existing `fractary-codex sync from-codex`).
- `Stop` / `SessionEnd` hook: invoke `fractary-codex-auto-memory-sync push` to write any new auto-memories back into the project's codex memory dir.
- Existing `fractary-codex sync` (already wired for codex.corthos.ai) handles the remote piece.

**A.3. Path-encoding portability.** Auto-memory dir is keyed by the project's absolute path. Since the bridge skill is parameterized on the CURRENT project (via `cwd`), each machine's auto-memory dir name is computed correctly without you having to remember it. You can have the project at `/home/ubuntu/.../core.corthodex.ai` on one machine and `/home/jmcwilliam/work/core.corthodex.ai` on another — the bridge handles both.

### Part B — Session logs → S3 (~30 min)

**B.1. Pick a bucket.** Suggested: `fractary-claude-sessions` in `us-east-1` (or whichever region aligns with the rest of the corthos infrastructure). Bucket policy: server-side encryption SSE-S3, lifecycle rules as noted above.

**B.2. SessionEnd hook script.** A shell script that:
- Reads `$CLAUDE_PROJECT_DIR` / `$CLAUDE_SESSION_ID` from hook env vars.
- Computes S3 key: `sessions/$(hostname -s)/<org>/<project-name>/$(date +%Y/%m/%d)/<session-id>.jsonl`.
- `aws s3 cp` with `--storage-class STANDARD` (lifecycle handles tiering).
- Logs success/failure to `~/.claude/logs/session-upload.log`.

**B.3. Lifecycle policy.** Terraform / aws CLI to set up:
```
STANDARD → STANDARD-IA (30 days) → DEEP_ARCHIVE (90 days)
```
Expected steady-state cost for 100 sessions × 5MB/session × 365 days: ~$0.30/month after 90-day transition.

**B.4. Optional: redaction pass.** Session JSONL may include `gh auth token` output, AWS access keys printed in plan output, etc. Add a `jq`-based pre-upload filter that strips known-sensitive patterns. Lower priority — start without it, add if needed.

### Part C — Cross-project memory access (no new folder; pure config)

The codex sync model already supports this. Two changes per consuming project, both in `.fractary/config.yaml`:

**C.1. Add the source projects' memory paths to `from_codex.include`:**
```yaml
from_codex:
  include:
    # existing entries...
    - codex://corthosai/<source-project>/.fractary/codex/memory/**
    # add one line per source project whose memories this project should see
```

**C.2. The bridge skill (Part A.1) automatically surfaces the pulled files** in Claude Code's auto-memory loader on the next `SessionStart`. No additional convention needed.

**Convention question (open for you):** when you write an insight that applies to multiple projects, where does the SOURCE-OF-TRUTH copy live? Options:
- (a) In whichever project you happened to be working in when you wrote it — every project that wants it adds a `from_codex.include` line. ("Federated" model — every memory has one home, many consumers.)
- (b) In the `corthosai/codex.corthos.ai` repo's own `.fractary/codex/memory/` (this project IS the codex-of-codex). Org-wide insights live with the codex itself. ("Hub" model — one canonical location for org-wide stuff.)

(b) is slightly more discoverable. (a) is simpler — no separate decision about scope when writing. The bridge skill works for both.

## Key decisions for you (open questions)

1. **Hook-based auto-bridge vs manual?** Hook (recommended) syncs every session-start / session-end without thinking. Manual is more curated but requires you to remember.

2. **Federated vs Hub model for org-wide memories?** (Part C above) Federated = "memory lives in the project where it was written; consumers opt in". Hub = "org-wide memories live in `codex.corthos.ai` itself". I'd lean federated for simplicity.

3. **S3 bucket — new or reuse existing?** New (recommended) — sessions are a distinct concern from data lake content; lifecycle rules differ. Suggested name `fractary-claude-sessions`.

4. **Session log retention?** The lifecycle proposal moves to Deep Archive at 90 days (essentially forever-retention at minimal cost) — but you could also expire after 1 year if you don't expect to need older sessions. Deep Archive default is reasonable.

5. **Existing project-local auto-memory: backfill to codex now?** Today we created 8 auto-memory entries during work on `core.corthodex.ai`. They're sitting at `~/.claude/projects/-home-ubuntu-GitHub-corthos-core-corthodex-ai/memory/` only. After the bridge skill exists, a one-time `push` migrates them into `.fractary/codex/memory/auto/` (committed to the project repo) + synced to codex.

6. **Frontmatter format — preserve auto-memory's simpler schema, or convert to codex's structured schema?** Today's auto-memory entries use `name`/`description`/`metadata.type`; codex memories use `id`/`title`/`type`/`status`/`tags`/`related`. The bridge can either keep them parallel (auto-memory format stays in `.fractary/codex/memory/auto/`) or convert on push. Keeping them parallel is simpler and avoids losing information; conversion fits the codex memory-audit/lifecycle tooling better. Recommend KEEP-PARALLEL for v1 — convert later if/when needed.

## What I'd implement first (smallest valuable slice)

1. **Backfill TODAY's 8 auto-memory entries** into `core.corthodex.ai`'s `.fractary/codex/memory/auto/` manually (one-time, 10 min). Keep the auto-memory frontmatter format as-is (see decision 6 above).
2. **Run `fractary-codex sync to-codex`** to push them up to `corthosai/codex.corthos.ai`. They immediately become available to anyone who pulls from the codex repo on any machine.
3. **Then build the auto-bridge skill + hooks** (~1 hour). This is the durable piece — every future session automatically syncs.
4. **Then S3 session backup** (~30 min, separate PR).

After step 2 you already have cross-machine portability of today's learnings — just no automation yet for future entries.

## Files to create / modify

### For this project (`core.corthodex.ai`)
- `.fractary/config.yaml` — add `_shared/` codex path to `from_codex.include`
- `.fractary/codex/memory/auto/` — new directory, seed with today's 8 entries

### For the central codex repo (`corthosai/codex.corthos.ai`)
- No structural change required — the existing `projects/<project-name>/.fractary/codex/memory/` layout handles everything. The federated model means each project's memories live with their home project; no new shared folder.

### For the fractary-codex plugin (separate repo)
- `skills/fractary-codex-auto-memory-sync/SKILL.md` — push/pull bridge skill

### For S3 session backup
- `infrastructure/terraform/<wherever>` — new `aws_s3_bucket.claude_sessions` + lifecycle config + IAM
- `~/.claude/settings.json` (or project-level) — add `Stop` / `SessionEnd` hook that calls an `aws s3 cp` script

## Verification

- After Part A: open a fresh shell on machine B, `cd` to the project, run `fractary-codex sync from-codex`, then `fractary-codex-auto-memory-sync pull` → auto-memory dir on machine B contains the same 8 files as machine A.
- After Part B: trigger SessionEnd locally; verify `aws s3 ls s3://fractary-claude-sessions/sessions/$(hostname)/corthosai/core.corthodex.ai/$(date +%Y/%m/%d)/` shows the just-finished session log.
- After Part C: pull memories from project A and project B → both visible inside Claude Code's auto-memory loader on the next session.

## Deliverable for this turn

This plan is the SPEC for work that will be implemented in the `fractary/codex` plugin repo (the bridge skill is a new codex plugin skill) plus per-consuming-project config tweaks (`from_codex.include` additions; S3 hook).

To preserve the spec as a permanent record:

1. **Save in this project** at `docs/specs/SPEC-claude-memory-codex-bridge-and-session-logs.md` (this is `corthosai/core.corthodex.ai`'s normal home for design specs).
2. **Push a copy** to the `fractary/codex` plugin repo (the implementation target) — either:
   - As a file in `docs/specs/` (or wherever that repo collects design docs).
   - Or as the body of a new GitHub issue on `fractary/codex` so the work can be tracked there.

I have `gh` auth for `github.com` (account `jmcwilliam`) which should be able to push to `fractary/codex` if you have write access on that repo. The local clone of `fractary/codex` (if any) is unknown — the plugin currently lives in this machine's read-only cache at `~/.claude/plugins/marketplaces/fractary-codex/`, which is not a working git checkout we can commit from.

### Execution steps (after plan approval)

1. Copy this plan to `docs/specs/SPEC-claude-memory-codex-bridge-and-session-logs.md` in this project. Commit & push on a feature branch + open a PR for record-keeping.
2. Check if `fractary/codex` has a clone anywhere on this machine; if not, `git clone git@github.com:fractary/codex.git ~/GitHub/fractary/codex` (or wherever your fractary repos live).
3. Add the same spec file at `docs/specs/` in the fractary/codex clone (or in whatever location that repo uses for design docs). Commit on a feature branch + open a PR.
4. Optionally file an issue on `fractary/codex` linking back to the spec for tracking.
