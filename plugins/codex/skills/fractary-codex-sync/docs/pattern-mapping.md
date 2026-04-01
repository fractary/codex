# Pattern Mapping

Reference tables for inferring file patterns from GitHub issue content.

## Keyword-to-Pattern Mapping

| Keywords in issue | Inferred patterns |
|-------------------|-------------------|
| "api", "endpoint", "REST" | `docs/api/**`, `specs/*api*` |
| "auth", "authentication", "login" | `docs/auth/**`, `specs/*auth*` |
| "template", "scaffold" | `.fractary/templates/**` |
| "standard", "convention" | `.fractary/standards/**` |
| "spec", "specification" | `specs/**/*.md` |
| "guide", "tutorial", "how-to" | `docs/guides/**` |
| "readme", "overview" | `README.md`, `docs/README.md` |
| "memory", "knowledge" | `.fractary/codex/memory/**` |
| "config", "configuration" | `.fractary/config.yaml` |

## Label-to-Pattern Mapping

| Label | Inferred patterns |
|-------|-------------------|
| `documentation`, `docs` | `docs/**/*.md` |
| `specs`, `specification` | `specs/**/*.md` |
| `api` | `docs/api/**`, `specs/*api*` |
| `templates` | `.fractary/templates/**` |
| `standards` | `.fractary/standards/**` |

## Rules

1. Multiple keywords/labels can produce multiple patterns — combine them
2. If both keywords and labels match, use the union of patterns
3. User-provided `--include` patterns always override inferred patterns
4. If no patterns can be inferred, use default sync patterns (do not narrow)
