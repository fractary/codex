# ID Generation

Memory IDs follow the pattern: `MEM-{PREFIX}-{SEQ}-{slug}`

## Prefix Mapping

| Type | Prefix |
|------|--------|
| troubleshooting | TS |
| architectural-decision | AD |
| performance | PF |
| pattern | PT |
| integration | IN |
| convention | CV |

## Sequence Number

Scan the type directory to find the next available sequence:

Search for files matching `.fractary/codex/memory/{type}/MEM-{PREFIX}-*.md`.

Count existing files. Next sequence = count + 1, zero-padded to 3 digits (e.g., `001`, `042`).

## Slug Generation

From the title:
1. Convert to lowercase
2. Replace spaces and special characters with hyphens
3. Collapse consecutive hyphens
4. Truncate to 50 characters max
5. Remove leading/trailing hyphens

## Collision Check

Verify the target file path does not exist. If it does, increment sequence and retry.

## Examples

- `MEM-TS-001-cors-error-proxy-config`
- `MEM-AD-003-ndjson-changelog-format`
- `MEM-PF-012-connection-pooling-postgres`
