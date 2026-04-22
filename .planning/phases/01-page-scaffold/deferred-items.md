# Deferred Items

## Out-of-scope issues discovered during plan 01-01

### MailSales.tsx unused variable warning
- **File:** `src/pages/MailSales.tsx` line 46
- **Issue:** `'frontGross' is declared but its value is never read` (TS6133)
- **Status:** Pre-existing before plan 01-01 changes. Causes `npm run build` to fail via `tsc -b`.
- **Recommendation:** Fix in a dedicated chore task to clean up unused variables in MailSales.tsx.
