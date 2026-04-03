# Scoring Algorithm

Each memory receives a validity score from 0.0 to 1.0.

## Base Score Calculation

```
claims_verified = claims that checked out against project state
claims_failed = claims contradicted by current state
claims_unverifiable = claims that cannot be checked (neutral, excluded)

base_score = claims_verified / (claims_verified + claims_failed)
```

If no verifiable claims exist, assign 0.5 (neutral) and flag as "unverifiable."

## Staleness Penalty

```
staleness_penalty = 0.1 if not audited in {stale_days} days, else 0.0
```

Default stale threshold: 90 days (overridable with `--stale-days`).

## Final Score

```
validity_score = max(0.0, base_score - staleness_penalty)
```

In `--deep` mode, additional adjustments from `docs/deep-analysis.md` apply after this.

## Score Categories

| Score Range | Category | Action |
|-------------|----------|--------|
| 0.8 - 1.0 | Valid | Update `last_audited` only |
| 0.5 - 0.79 | Partial | Informational — note outdated claims |
| 0.3 - 0.49 | Warning | Present to user for decision |
| 0.0 - 0.29 | Critical | Present to user with urgency |

The action threshold (default 0.5) is overridable with `--threshold`.
