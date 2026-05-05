---
phase: 9
slug: infrastructure-count-correctness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | vite.config.ts (`test: { globals: true, environment: "jsdom" }`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DATA-01 | — | N/A | smoke | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 1 | STAT-01 | — | N/A | unit | `npm test -- src/lib/transactions.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | STAT-02 | — | N/A | unit | `npm test -- src/lib/transactions.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | STAT-03 | — | N/A | unit | `npm test -- src/lib/transactions.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/transactions.test.ts` — unit tests for computeAffiliateRankings (STAT-01, STAT-02, STAT-03)

*Existing test: `src/hooks/useAffiliateTags.test.ts` — tags, not affected by this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production API returns data (no 404) | DATA-01 | Requires deployed Vercel function | Deploy to Vercel, verify `/api/digistore` returns 200 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
