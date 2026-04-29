# Digistore24 API Deep Research -- Field Definitions, KPI Mapping & Edge Cases

**Researched:** 2026-04-28
**Domain:** Digistore24 listTransactions API, financial field semantics, KPI computation
**Confidence:** MEDIUM (official docs are partially gated; cross-verified with codebase empirical data)

---

## 1. API Financial Field Definitions

### 1.1 Fields Returned per Transaction (listTransactions)

| Field | Type (wire) | Sign Behavior | Definition | Confidence |
|-------|-------------|---------------|------------|------------|
| `amount` | string | Always positive | The gross price the buyer pays for this line item, **including VAT**. For refunds/CB, this is the **original order total**, NOT the refunded amount. For partial refunds (e.g. 30% of EUR 294), `amount` still shows EUR 294. | HIGH [VERIFIED: empirical audit of 981 transactions in DATA-PROVENANCE-AUDIT.md] |
| `transaction_amount` | string | Signed (+/-) | The actual monetary value of this transaction. Positive for payments, **negative for refunds/CB**. For partial refunds, this is the actual amount refunded (e.g. -88.20 for 30% of 294). This is the "ground truth" field for what money moved. | HIGH [VERIFIED: empirical audit -- 25 partial refunds confirmed amount != |transaction_amount|] |
| `earned_amount` | string | Signed (+/-) | Vendor's net earnings for this transaction, after Digistore margin, affiliate commission, and VAT are deducted. Positive for payments, **negative for refunds/CB**. Already reflects all platform deductions. | HIGH [VERIFIED: cross-check with API summary.earned_amount matched SUM to the cent (EUR 47,412.13)] |
| `merchant_amount` | string | Signed (+/-) | Functionally identical to `earned_amount`. [ASSUMED] Legacy/redundant field. The codebase uses it as fallback when `earned_amount` is absent. | MEDIUM [ASSUMED -- no official doc confirms equivalence, but empirical data shows identical values] |
| `users_share` | string | Signed (+/-) | [ASSUMED] Another alias for `earned_amount`/`merchant_amount`. Listed in API response but not used by AffiliView. No official documentation found defining this field. | LOW [ASSUMED -- mentioned in DATA-PROVENANCE-AUDIT as = earned_amount, but unverified against official docs] |
| `affiliate_amount` | string | Signed (+/-) | CPA commission paid to the affiliate for this transaction. Positive for payments, negative for refunds (commission clawed back). For direct sales (no affiliate), this is 0. | HIGH [VERIFIED: codebase uses it for CPA calculation; Digistore docs confirm affiliate commission exists] |
| `vat_amount` | string | Signed (+/-) | The VAT portion of the transaction. Positive for payments, negative for refunds/CB. The VAT rate depends on buyer's country (vat_country). | HIGH [VERIFIED: codebase uses it for net amount calculation; Digistore docs confirm VAT handling] |
| `upsell_no` | string | N/A (0+) | Position in the upsell funnel. `"0"` = front offer (main product purchase). `"1"` = first upsell, `"2"` = second, etc. Up to 6 upsell steps possible. | HIGH [VERIFIED: empirical data shows 0, 1, 2, 3; Digistore docs confirm up to 6 upsell steps] |

### 1.2 Fields NOT Used but Present in API Response

| Field | Probable Meaning | Potential Use | Confidence |
|-------|-----------------|---------------|------------|
| `billing_type` | `"single_payment"` or `"subscription"` | Segment by payment model | LOW [ASSUMED] |
| `billing_status` | Payment completion status | Filter incomplete payments | LOW [ASSUMED] |
| `items[].product_name_intern` | Internal product name per line item | More precise product identification | LOW [ASSUMED] |
| `items[].total_netto_amount` | Net amount per item | Net revenue per item breakdown | LOW [ASSUMED] |
| `commission_reason` | Why commission was applied | Debug earning calculations | LOW [ASSUMED] |
| `total_affiliate_amount` | Total CPA for entire purchase | Cross-check | LOW [ASSUMED] |
| `total_merchant_amount` | Total merchant earnings for entire purchase | Cross-check | LOW [ASSUMED] |
| `other_amounts` | Follow-up payment amounts for subscriptions | Subscription tracking | MEDIUM [CITED: dev.digistore24.com createBuyUrl docs] |
| `other_merchant_amounts` | Merchant share of follow-up payments | Subscription earnings | LOW [ASSUMED] |
| `other_affiliate_amounts` | Affiliate share of follow-up payments | Subscription CPA | LOW [ASSUMED] |
| `other_vat_amounts` | VAT on follow-up payments | Subscription VAT | LOW [ASSUMED] |

### 1.3 Critical Distinction: `amount` vs `transaction_amount`

```
PAYMENT:
  amount = 294.00              (what buyer pays, VAT included)
  transaction_amount = 294.00  (same for full-price payments)
  → Usually identical. Rare exceptions: price adjustments (2 of 867 payments in sample, delta EUR 52.36)

FULL REFUND:
  amount = 294.00              (ORIGINAL order total -- always positive)
  transaction_amount = -294.00 (actual refunded amount -- negative)
  → amount is misleading for refund value calculations

PARTIAL REFUND (30%):
  amount = 294.00              (ORIGINAL order total -- always positive, WRONG for actual refund)
  transaction_amount = -88.20  (actual refunded amount -- negative, CORRECT)
  → Using `amount` overestimates refund value by 70% for this transaction
```

**Bottom line:** For refunds/chargebacks, `|transaction_amount|` is the correct field for "how much was actually refunded." The `amount` field shows the original purchase price, which is wrong for partial refunds. [VERIFIED: DATA-PROVENANCE-AUDIT.md finding F-01]

---

## 2. Transaction Types

### 2.1 Valid API Search Types

The `search[transaction_type]` parameter accepts ONLY these values (comma-separated):

| Type | Meaning | Notes |
|------|---------|-------|
| `payment` | Successful payment | Includes front offers AND upsells (differentiated by `upsell_no`) |
| `refund` | Vendor/platform-initiated refund | Full or partial. IPN: `on_refund` event |
| `chargeback` | Bank-initiated dispute/reversal | Customer initiated with their bank. IPN: `on_chargeback` event |

[VERIFIED: AffiliView sends `"payment,refund,chargeback"` and gets HTTP 200. Sending `"sale"`, `"upsell"`, `"return"`, or `"reversal"` causes HTTP 400.]

### 2.2 Additional Types Encountered

| Type | Behavior | Status |
|------|----------|--------|
| `refund_request` | Customer requested a refund, not yet processed | Returned by API but **filtered out** by AffiliView normalizer before processing |

### 2.3 Types That Do NOT Exist in the API

These types are recognized in the normalizer for backward compatibility (CSV imports) but the API never returns them:

- `sale` -- the API uses `payment` for all sales
- `upsell` -- the API uses `payment` with `upsell_no >= 1`
- `return` -- the API uses `refund`
- `reversal` -- the API uses `chargeback` (or `refund` depending on context)

[VERIFIED: empirical observation -- 981 transactions contained only `payment`, `refund`, `chargeback`]

---

## 3. Digistore24 Revenue Distribution Formula

### 3.1 Official Distribution Order

From the buyer's gross payment, deductions happen in this order:

```
1. VAT (tax office)           = depends on buyer's country rate
2. Digistore24 margin         = 7.9% of gross price + EUR 1.00
3. Affiliate commission       = X% of "basic amount" (net minus Digistore margin)
4. Joint venture partner share = Y% of basic amount (if applicable)
5. Vendor earnings (your share) = remainder
```

[CITED: help.digistore24.com/hc/en-us/articles/23522840526481-Distribution-of-gross-revenue]

### 3.2 Worked Example (from official docs)

For a gross price of EUR 100 with 7.7% VAT (Switzerland) and 50% affiliate commission:

| Recipient | Amount | Calculation |
|-----------|--------|-------------|
| Tax office (VAT) | EUR 7.70 | 7.7% of EUR 100 |
| Digistore24 | EUR 8.90 | 7.9% of EUR 100 + EUR 1.00 |
| Affiliate | EUR 41.70 | 50% of (100 - 7.70 - 8.90) = 50% of 83.40 |
| Vendor (you) | EUR 41.70 | 50% of 83.40 |

[CITED: help.digistore24.com/hc/en-us/articles/23522840526481-Distribution-of-gross-revenue]

### 3.3 How `earned_amount` Is Computed

```
earned_amount = amount - vat_amount - digistore_margin - affiliate_amount - jv_partner_amount
```

Where:
- `digistore_margin = 0.079 * amount + 1.00` (EUR, for European entities)
- `affiliate_amount` = commission % applied to "basic amount" (amount - vat - digistore_margin)
- `jv_partner_amount` = JV share % applied to same basic amount (0 if no JV partner)

**For AffiliView verification:**
```
earned_amount should approximately equal:
  amount - vat_amount - (0.079 * amount + 1) - affiliate_amount
```

[MEDIUM confidence -- formula derived from official distribution docs + empirical data. The EUR 1.00 fixed fee may vary by region (USD 1.00 in US).]

---

## 4. Dashboard KPI Definitions (Official)

### 4.1 Gross Amount

**Official definition:** "Gross revenue refers to the money earned from a sale before any deductions." The gross sales show the gross revenue including the affiliate's commission, taxes, the Digistore24 margin, and the vendor's share. [CITED: help.digistore24.com/hc/en-us/articles/24291910522769]

**Probable API mapping:** `SUM(transaction_amount) WHERE payment` (positive values only)

**AffiliView mapping:** `SUM(amount) WHERE payment` -- differs by using `amount` instead of `transaction_amount`

**Match assessment:** ~99.98% match (EUR 52.36 difference in EUR 214K sample). The delta comes from 2 transactions where `amount != transaction_amount` (price adjustments). [VERIFIED: DATA-PROVENANCE-AUDIT F-02]

### 4.2 Net Amount

**Official definition:** "What remains after tax deductions is referred to as net revenue." [CITED: help.digistore24.com KPIs-and-display-types]

**Formula:** `Gross Amount - VAT`

**AffiliView mapping:** `netAmount = amount - vat_amount` (for payments only). Used in AOV calculation, not displayed as a standalone KPI card.

### 4.3 Your Earnings

**Official definition:** "The share of the net revenue that remains for you after all deductions and fees and is later transferred to your bank account is your earnings. Earnings are also referred to as the vendor share." [CITED: help.digistore24.com KPIs-and-display-types]

**Formula:** `Gross - VAT - Digistore Margin - Affiliate Commission - JV Partner Share = earned_amount`

**AffiliView mapping:** `SUM(earned_amount) ALL transaction types` = `earningsKPI`

**Match assessment:** 100% EXACT MATCH. AffiliView's `earningsKPI` (EUR 47,412.13) matches API summary `earned_amount` (EUR 47,412.13) to the cent. [VERIFIED: DATA-PROVENANCE-AUDIT Section 10]

### 4.4 Cancellation Rate (Digistore's Refund/CB Metric)

**Official definition:** "It is not the number of refunds that counts towards the cancellation rate, but rather the amount." [CITED: help.digistore24.com Refunds-and-returns]

**Key insight:** Digistore's cancellation rate is **value-based**, not count-based. Partial refunds affect the rate proportionally to the refunded amount, not as a full cancellation.

**AffiliView mapping:** `refundPct = refundAmt / gross * 100` -- also value-based. MATCH in methodology.

**BUT:** AffiliView's `refundAmt` was using `amount` (original order total) instead of `|transaction_amount|` (actual refunded amount). This was identified as F-01 in the audit and has been corrected in the normalizer (the current code shows the fix at line 125-127 of digiNormalizer.ts).

---

## 5. KPI-by-KPI Cross-Reference

### 5.1 Gross Revenue

| Attribute | Value |
|-----------|-------|
| **Our formula** | `SUM(grossAmount) WHERE isPayment(t)` -- all upsell_no values |
| **API field used** | `amount` (normalized as `grossAmount` for payments) |
| **Official definition** | Sum of gross revenue from all sales, including affiliate commission, taxes, margin, vendor share [CITED: help.digistore24.com] |
| **Match assessment** | 99.98% -- `amount` vs `transaction_amount` delta is EUR 52 in EUR 214K (0.02%). Insignificant. |
| **Edge cases** | (1) Price adjustments where `amount != transaction_amount` cause tiny discrepancy. (2) If Digistore dashboard uses `transaction_amount`, our number will be slightly higher. |
| **Confidence** | HIGH |

### 5.2 Earnings

| Attribute | Value |
|-----------|-------|
| **Our formula** | `SUM(earnings) WHERE payment` + `SUM(earnings) WHERE refund/chargeback` |
| **API field used** | `earned_amount` (fallback: `merchant_amount`) |
| **Official definition** | Vendor share after all deductions (VAT, Digistore margin, affiliate commission) [CITED: help.digistore24.com] |
| **Match assessment** | 100% EXACT MATCH with API summary |
| **Edge cases** | (1) Sign enforcement: normalizer forces negative for refund/CB if API returns positive. (2) Fallback to `merchant_amount` if `earned_amount` missing -- untested in production but safe. |
| **Confidence** | HIGH |

### 5.3 AOV (Ticket Medio)

| Attribute | Value |
|-----------|-------|
| **Our formula** | `SUM(netAmount WHERE payment) / COUNT(WHERE payment AND upsellNo=0)` |
| **API fields used** | `amount`, `vat_amount` (netAmount = amount - vat_amount), `upsell_no` |
| **Official definition** | No official Digistore AOV definition found. This is a custom AffiliView metric. |
| **Match assessment** | N/A -- no Digistore equivalent. Our formula is standard e-commerce AOV: total net revenue per unique order. |
| **Edge cases** | (1) VAT-exclusive numerator means AOV varies by buyer country mix (different VAT rates). (2) If a front payment has upsell_no > 0 (API error), it would be excluded from denominator but included in numerator, inflating AOV. Never observed in practice. |
| **Confidence** | HIGH (formula is correct for business logic, no official comparison possible) |

### 5.4 Refund + Chargeback %

| Attribute | Value |
|-----------|-------|
| **Our formula** | `(SUM(grossAmount WHERE refund) + SUM(grossAmount WHERE chargeback)) / gross * 100` |
| **API fields used** | `transaction_amount` for refunds (as `grossAmount = |transaction_amount|`), `amount` for payments (as `grossAmount`) |
| **Official definition** | Value-based: "it is not the number of refunds that counts towards the cancellation rate, but rather the amount" [CITED: help.digistore24.com] |
| **Match assessment** | ALIGNED after F-01 fix. The current normalizer (line 125-127) correctly uses `|transaction_amount|` for refunds/CB, matching Digistore's value-based approach. |
| **Edge cases** | (1) Partial refunds: correctly handled via `|transaction_amount|`. (2) Chargeback fees (EUR 12-15) are NOT included in `transaction_amount` -- they're a separate line item. This means our CB rate slightly underestimates total CB cost. (3) The denominator is payment gross -- if a period has many refunds but few new payments, the rate can spike. |
| **Confidence** | HIGH (post-fix) |

### 5.5 Valor Liquido (LIA)

| Attribute | Value |
|-----------|-------|
| **Our formula** | `earningsFront - COGS` where `earningsFront = SUM(earned_amount WHERE payment AND upsellNo=0) + SUM(earned_amount WHERE refund/CB AND upsellNo=0)` |
| **API fields used** | `earned_amount`, `upsell_no`, `main_product_name`, `vat_country` |
| **Official definition** | No Digistore equivalent. This is a custom AffiliView metric combining API earnings with internal COGS data. |
| **Match assessment** | N/A -- entirely custom. |
| **Edge cases** | (1) COGS is applied only to front payments (upsells are digital, no fulfillment cost). (2) Refund COGS is sunk cost (product already shipped). (3) If a refund has `upsellNo != 0`, it's excluded from `earningsFront` -- correct behavior (upsell refund shouldn't reduce front-only earnings base). (4) The Z6 shipping discount (customer pays EUR 20) is applied only to `upsellNo === 0`. |
| **Confidence** | HIGH (internal logic is sound, no external comparison needed) |

### 5.6 Sales Count

| Attribute | Value |
|-----------|-------|
| **Our formula** | `COUNT(WHERE payment AND upsellNo === 0)` |
| **API fields used** | `transaction_type`, `upsell_no` |
| **Official definition** | No specific Digistore definition. The dashboard likely shows total transactions, not front-only. |
| **Match assessment** | Intentionally different -- AffiliView counts "unique orders" (front payments), not total transactions. |
| **Edge cases** | (1) If an order has only upsells (no front payment), it would be missed. This shouldn't happen in practice -- upsell_no=0 always exists for the initial purchase. |
| **Confidence** | HIGH |

---

## 6. Upsell Handling

### 6.1 How Upsells Work in the API

- All upsells come as `transaction_type: "payment"` -- there is no separate `"upsell"` type
- The `upsell_no` field differentiates: `0` = front offer, `1`+ = upsell/downsell position
- Each upsell is a separate transaction with its own `transaction_id` but shares the `purchase_id` with the front offer
- Up to 6 upsell steps are supported by Digistore24 [CITED: help.digistore24.com Upsells]
- In practice, the AffiliView dataset shows upsell_no values of 0, 1, 2, 3

### 6.2 Upsell Distribution (from audit data)

```
upsell_no=0: 758 payments (front orders)
upsell_no=1: 101 payments (1st upsell)
upsell_no=2:  22 payments (2nd upsell)
upsell_no=3:   1 payment  (3rd upsell)
```

[VERIFIED: DATA-PROVENANCE-AUDIT Section 7]

### 6.3 Can Refunds Have upsell_no > 0?

**Yes.** A refund for an upsell product would have the same `upsell_no` as the original upsell payment. The refund is tied to the specific line item in the purchase, not just the front offer. [ASSUMED -- logically consistent with purchase_id/upsell_no model, but not empirically verified in the 30-day sample which had all 109 refunds at upsell_no=0]

**Edge case:** If a customer buys front + 2 upsells, then refunds only upsell #2, the refund transaction would have `upsell_no=2` and `transaction_type="refund"`. AffiliView's current normalizer handles this correctly -- `grossAmount = |transaction_amount|` regardless of `upsell_no`.

### 6.4 Upsells and AffiliView Metrics

| Metric | Includes upsells? | Rationale |
|--------|-------------------|-----------|
| Gross Revenue | Yes (all payments) | Aligned with Digistore "Gross Amount" |
| Earnings | Yes (all payments + all refunds/CB) | Aligned with Digistore "Your Earnings" |
| AOV | Yes in numerator, No in denominator | AOV = total net / front orders = "average basket size" |
| Sales count | No (front only) | Counts unique orders, not line items |
| Valor Liquido | No (front only for COGS) | Upsells are digital, no fulfillment cost |
| Refund/CB % | Uses all gross (incl. upsells) as denominator | Correct: refund value relative to total revenue |
| Product Summary | Front transactions only for product-level metrics | Upsell products counted separately in backend analysis |

---

## 7. Refund Mechanics

### 7.1 Full Refund

When a full refund is processed:

```
transaction_type:    "refund"
amount:              294.00     (original order total, positive)
transaction_amount:  -294.00    (full refund, negative)
earned_amount:       -X.XX      (vendor's share returned, negative)
affiliate_amount:    -Y.YY      (affiliate commission clawed back, negative)
vat_amount:          -Z.ZZ      (VAT reversed, negative)
upsell_no:           0          (matches original purchase position)
purchase_id:         same as original payment
```

### 7.2 Partial Refund

When a partial refund is processed (e.g. 30% of EUR 294):

```
transaction_type:    "refund"
amount:              294.00     (ORIGINAL order total -- NOT the refunded amount!)
transaction_amount:  -88.20     (actual amount refunded = 30% of 294)
earned_amount:       -74.31     (proportional vendor share reversed)
affiliate_amount:    -XX.XX     (proportional commission clawed back)
vat_amount:          -XX.XX     (proportional VAT reversed)
```

**Critical:** For partial refunds, `amount` is WRONG for computing refund value. Only `transaction_amount` reflects reality.

### 7.3 Partial Refund Statistics

From the 30-day audit sample:
- 84 full refunds (amount == |transaction_amount|)
- 25 partial refunds (amount > |transaction_amount|)
- Partial refund percentages observed: 30%, 40%, 50% of original value
- Impact of using `amount` instead of `|transaction_amount|`: +1.9 percentage points on refund rate (13.0% vs 11.2%)

[VERIFIED: DATA-PROVENANCE-AUDIT F-01]

### 7.4 Partial Refund IPN Behavior

**Important:** No IPN notifications are sent for partial refunds. Only full refunds trigger IPN events. [CITED: help.digistore24.com Refunds-and-returns]

This means if you rely on IPN for refund tracking, partial refunds are invisible. The API `listTransactions` endpoint is the only reliable way to capture partial refunds.

### 7.5 Payment Status After Partial Refund

The payment status does not change for partial refunds. Subscriptions and installments continue as normal. [CITED: help.digistore24.com Refunds-and-returns]

---

## 8. Chargeback Mechanics

### 8.1 How Chargebacks Differ from Refunds

| Aspect | Refund | Chargeback |
|--------|--------|------------|
| **Initiated by** | Vendor/platform (voluntary) | Customer's bank (dispute) |
| **Timeframe** | At vendor's discretion | Up to 1 year after purchase |
| **Additional fees** | None | EUR 12 (DE direct debit) or EUR 15 (AT direct debit) |
| **Fee in transaction_amount?** | N/A | No -- fee is separate line item |
| **Impact on vendor** | Earnings reduced | Earnings reduced + chargeback fee + account risk |
| **Dashboard display** | Chargeback fee NOT in transaction list total, but IS in dashboard total | Same |
| **IPN event** | `on_refund` | `on_chargeback` |

[CITED: help.digistore24.com FAQs-about-chargebacks-and-customer-payment-defaults]

### 8.2 Chargeback Fields in API

Chargebacks appear with `transaction_type: "chargeback"` and follow the same field structure as refunds:

```
transaction_type:    "chargeback"
amount:              294.00     (original order total, positive)
transaction_amount:  -294.00    (full chargeback amount, negative)
earned_amount:       -X.XX      (vendor share reversed, negative)
affiliate_amount:    -Y.YY      (affiliate commission clawed back, negative)
```

**Note:** The chargeback FEE (EUR 12-15) is NOT included in these fields. It appears separately in the commission list of the order. AffiliView does not currently track chargeback fees. [ASSUMED -- based on official docs stating fee is "listed as chargeback fee in the commission list"]

### 8.3 Chargeback Statistics (from audit)

```
Chargebacks in 30-day sample: 5 (of 981 total transactions)
Average Digistore24 chargeback frequency: 1-2%
```

[VERIFIED: audit data + CITED: help.digistore24.com chargebacks]

---

## 9. IPN vs API Differences

### 9.1 IPN-Only Fields

IPN notifications use a different naming convention for amount fields:

| IPN Field | API Equivalent | Notes |
|-----------|---------------|-------|
| `amount_brutto` | `amount` | Gross amount including VAT |
| `amount_netto` | `amount - vat_amount` | Net of VAT |
| `amount_vat` | `vat_amount` | VAT portion (`vat_amount` is deprecated in IPN, use `amount_vat`) |
| `amount_payout` | ~`earned_amount` | Payout amount |
| `amount_merchant` | `merchant_amount` | Merchant share |
| `amount_affiliate` | `affiliate_amount` | Affiliate commission |
| `amount_fee` | N/A (not in listTransactions) | Digistore24 margin fee |
| `amount_provider` | N/A | Provider share |
| `amount_partner` | N/A | JV partner share |

[MEDIUM confidence -- derived from IPN documentation search results + naming convention analysis]

### 9.2 Key IPN Limitation

**Partial refunds do NOT trigger IPN notifications.** Only the API `listTransactions` captures partial refunds. This is critical -- any system relying solely on IPN will miss ~23% of refunds (based on our data). [CITED: help.digistore24.com Refunds-and-returns]

### 9.3 IPN Events vs API Transaction Types

| IPN Event | API transaction_type | Notes |
|-----------|---------------------|-------|
| `on_payment` | `payment` | Includes upsells (differentiated by IPN field) |
| `on_refund` | `refund` | Only full refunds |
| `on_chargeback` | `chargeback` | Bank-initiated |
| `on_payment_missed` | N/A | Subscription payment failed -- not in listTransactions |

---

## 10. Known API Quirks and Edge Cases

### 10.1 Rate Limits

**No official rate limit documentation found.** [LOW confidence]

AffiliView implements a 300ms delay between paginated requests (`PAGE_DELAY_MS = 300` in useDigistoreAPI.ts). This is a conservative approach but its necessity is unverified -- the API may tolerate faster requests.

### 10.2 Pagination

| Parameter | Value | Notes |
|-----------|-------|-------|
| `page_size` | Up to 1000 | AffiliView uses maximum (1000) |
| `page_no` | 1-based | First page is 1, not 0 |
| `page_count` | In response | Total pages available |
| Default `page_size` | 100 | Per Rollout integration guide |

[MEDIUM confidence -- verified from codebase behavior + partial documentation]

### 10.3 Date/Time Handling

- `transaction_pay_date` format: `"YYYY-MM-DD"` or `"YYYY-MM-DD HH:MM:SS"`
- AffiliView normalizes to `YYYY-MM-DDT00:00:00Z` (truncates time, treats as UTC midnight)
- The `from`/`to` parameters accept: `"YYYY-MM-DD"`, `"-7d"`, `"-30d"`, `"now"`, `"start"`
- **Timezone:** Not explicitly documented. AffiliView treats all dates as UTC. [ASSUMED]

### 10.4 String vs Number Type Inconsistency

All monetary fields come as **strings** from the API (e.g. `"294.00"`), not numbers. The `parseMoney()` function handles:
- Standard decimal: `"294.00"`
- European thousands: `"1.234,56"` -> `1234.56`
- Comma decimal: `"294,00"` -> `294.00`
- CSV wrapper: `="294.00"` -> `294.00`

`upsell_no` comes as a string too (e.g. `"0"`, `"1"`) and is converted via `Number()`.

[VERIFIED: codebase parseMoney function handles all formats]

### 10.5 API Summary Object

The `data.summary` object in the API response provides aggregated totals:

```json
{
  "amounts": {
    "EUR": {
      "count": 981,
      "total_amount": 189330.53,
      "vat_amount": 11689.87,
      "earned_amount": 47412.13
    }
  }
}
```

Key insights:
- `total_amount` = `SUM(transaction_amount)` -- this is a **signed sum** (payments minus refunds/CB). It is NOT gross revenue.
- `earned_amount` = `SUM(earned_amount)` -- net earnings across all transaction types
- `count` = total number of transactions (all types)

AffiliView does not currently use this summary for validation. **Recommendation:** Use `summary.earned_amount` as a sanity check against computed `earningsKPI`.

[VERIFIED: DATA-PROVENANCE-AUDIT Section 1]

### 10.6 Dashboard vs API Value Discrepancies

**Official note from Digistore24:** Dashboard values are **estimates** -- chargebacks, fees, and refunds can alter final values. If you earn as both vendor AND affiliate, the dashboard combines both roles, but the API separates by `role` parameter. [VERIFIED: DATA-PROVENANCE-AUDIT Section 9]

AffiliView correctly uses `search[role]=vendor` to get only vendor transactions, avoiding the dual-role aggregation issue.

---

## 11. Commission/Payout Calculation Deep Dive

### 11.1 Digistore24 Margin

```
Digistore Margin = 7.9% of gross price + EUR 1.00 (Europe)
                 = 7.9% of gross price + USD 1.00 (US)
```

[CITED: help.digistore24.com Costs-at-Digistore24-in-Europe]

### 11.2 Affiliate Commission Base

The affiliate commission is NOT calculated from the gross price. It's calculated from the "basic amount":

```
Basic Amount = Gross Price - VAT - Digistore Margin
Affiliate Commission = Commission% * Basic Amount
```

[CITED: help.digistore24.com Distribution-of-gross-revenue]

### 11.3 Verification Formula

To verify `earned_amount` for a single transaction:

```
expected_earned = amount - vat_amount - (0.079 * amount + 1.00) - affiliate_amount
actual_earned   = earned_amount

difference should be < EUR 0.02 (rounding)
```

**Caveat:** This formula assumes no JV partner. If a JV partner exists, their share is also deducted from the basic amount. [ASSUMED -- JV partner handling not observed in AffiliView data]

---

## 12. Normalizer Correctness Audit

### 12.1 Current Normalizer Logic (post-F-01 fix)

```typescript
// For payments:
grossAmount = amount                    // correct: buyer's gross payment
netAmount   = amount - vat_amount       // correct: net of VAT

// For refunds/CB:
grossAmount = |transaction_amount|      // CORRECT (post-fix): actual refunded amount
netAmount   = 0                         // intentional: refunds don't contribute to net totals

// Earnings:
earnings = earned_amount                // correct: signed, already net of all deductions
         // with sign enforcement: if refund/CB and positive, negate it
```

### 12.2 Remaining Concerns

| Concern | Severity | Details |
|---------|----------|---------|
| `netAmount = 0` for refunds | Low | Intentional design choice. Refunds affect earnings but not net revenue directly. AOV excludes refunds. |
| Price adjustment transactions | Negligible | 2 of 867 payments have `amount != transaction_amount`. Delta is EUR 52 in EUR 214K. |
| `merchant_amount` fallback | Low | If `earned_amount` is ever absent, we fall back to `merchant_amount`. These are likely identical, but unverified officially. |
| Chargeback fees not tracked | Low | EUR 12-15 per CB is not in transaction fields. With 5 CBs in 30 days, this is ~EUR 60-75 untracked cost. |

---

## 13. Edge Cases and Gotchas Summary

### 13.1 Data Quality

1. **Partial refunds inflate rates if using `amount`** -- FIXED in current normalizer [VERIFIED]
2. **IPN misses partial refunds** -- Not relevant for AffiliView (uses API, not IPN) [CITED]
3. **Dashboard combines vendor+affiliate roles** -- Not relevant (AffiliView filters by `role=vendor`) [VERIFIED]
4. **Chargeback fees are invisible in transaction fields** -- Minor cost underestimate (~EUR 60-75/month) [CITED]

### 13.2 API Behavior

5. **Monetary fields are strings** -- parseMoney handles this correctly [VERIFIED]
6. **upsell_no is a string** -- Number() conversion handles this [VERIFIED]
7. **No documented rate limits** -- 300ms delay is conservative but safe [ASSUMED]
8. **page_count can be 0** -- If no transactions match, the loop won't execute [ASSUMED]
9. **API returns `refund_request` type** -- Correctly filtered out before normalization [VERIFIED]

### 13.3 Business Logic

10. **Refund for an upsell** -- Would have `upsell_no > 0`. Currently not observed in data but code handles it correctly. [ASSUMED]
11. **Same `purchase_id` for front + upsells** -- Not currently used for grouping in AffiliView. Could be used for order-level analysis. [VERIFIED]
12. **VAT rates vary by country** -- `vat_country` determines the rate. AOV uses net (amount - vat) so it's VAT-adjusted. [VERIFIED]
13. **Currency is always EUR** -- For this vendor. The API supports multi-currency via the summary object. [VERIFIED]

---

## 14. Recommendations

### Priority 1: Validation

1. **Add API summary cross-check** -- After fetching all pages, compare `SUM(earned_amount)` with `summary.earned_amount`. If mismatch > EUR 1, flag as data integrity error. Cost: ~5 lines of code.

### Priority 2: Accuracy

2. **Consider `transaction_amount` for payments** -- For the 0.02% of transactions where `amount != transaction_amount`, using `transaction_amount` would be more accurate. Impact is negligible but conceptually correct.

### Priority 3: Completeness

3. **Track chargeback fees** -- The EUR 12-15 per chargeback fee is not in the transaction fields. Would need `listPurchases` or commission list access to capture these.

4. **Expose `billing_type`** -- Could segment single payments vs subscriptions for additional analytics.

---

## 15. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `merchant_amount` = `earned_amount` (redundant field) | 1.1 | If different, fallback logic would produce wrong earnings for transactions where `earned_amount` is absent |
| A2 | `users_share` = `earned_amount` (another alias) | 1.1 | No impact -- field is not used by AffiliView |
| A3 | Chargeback fee (EUR 12-15) is NOT included in `transaction_amount` or `earned_amount` | 8.1 | If included, our CB rate would already account for fees (unlikely based on docs) |
| A4 | Refunds for upsells carry `upsell_no > 0` | 6.3 | If all refunds come with `upsell_no=0` regardless, our upsell_no-based filtering for earningsFront would include upsell refund deductions in front earnings -- slightly understating valorLiq |
| A5 | API has no rate limit enforcement (beyond being polite with 300ms delay) | 10.1 | If rate limited, faster requests could cause HTTP 429 errors |
| A6 | All dates are UTC | 10.3 | If timezone is CET/CEST, date boundary transactions could be assigned to wrong day |
| A7 | Digistore margin is exactly 7.9% + EUR 1.00 for all European transactions | 11.1 | If margin varies by product type or volume tier, earned_amount verification formula would not match |

---

## 16. Sources

### Primary (HIGH confidence)
- **AffiliView Codebase** -- `src/utils/digiNormalizer.ts`, `src/lib/transactions.ts`, `src/hooks/useDigistoreAPI.ts`, `api/digistore.ts`
- **DATA-PROVENANCE-AUDIT.md** -- 981-transaction empirical audit with cross-verification
- **Digistore24 Help Center: Distribution of gross revenue** -- https://help.digistore24.com/hc/en-us/articles/23522840526481-Distribution-of-gross-revenue
- **Digistore24 Help Center: KPIs and display types** -- https://help.digistore24.com/hc/en-us/articles/24018839571345-KPIs-and-display-types
- **Digistore24 Help Center: Refunds and returns** -- https://help.digistore24.com/hc/en-us/articles/24292990530321-Refunds-and-returns
- **Digistore24 Help Center: Chargebacks and payment defaults** -- https://help.digistore24.com/hc/en-us/articles/24293003033489-Chargebacks-and-payment-defaults
- **Digistore24 Help Center: Costs in Europe** -- https://help.digistore24.com/hc/en-us/articles/23694504392721-Costs-at-Digistore24-in-Europe
- **Digistore24 Help Center: What you need to know** -- https://help.digistore24.com/hc/en-us/articles/24291910522769-What-you-need-to-know
- **Digistore24 Help Center: Upsells** -- https://help.digistore24.com/hc/en-us/articles/24285485511313-Upsells

### Secondary (MEDIUM confidence)
- **Digistore24 Developer Docs: listTransactions** -- https://dev.digistore24.com/hc/en-us/articles/32642942100241-listTransactions (403 blocked, confirmed endpoint name and behavior via codebase)
- **Digistore24 Developer Docs: API basics** -- https://dev.digistore24.com/hc/en-us/articles/32479630493585-API-basics
- **Adverity Connector Docs** -- https://docs.adverity.com/reference/connectors/connector-digistore24.html (field naming confirmed)

### Tertiary (LOW confidence)
- **Rollout Integration Guide** -- https://rollout.com/integration-guides/digistore24/api-essentials (general API patterns, no specific field definitions)
- **Digistore24 IPN PDF** -- https://www.digistore24.com/download/ipn/examples/ipn/digistore_ipn.pdf (not fully parseable)

---

## 17. Confidence Summary

| Area | Level | Reason |
|------|-------|--------|
| Financial field semantics | HIGH | Empirically verified against 981 transactions + API summary cross-check |
| Gross Revenue formula | HIGH | 99.98% match with expected, official definition aligned |
| Earnings formula | HIGH | 100% exact match with API summary |
| Refund/CB rate formula | HIGH | Post-fix uses correct field (`|transaction_amount|`), methodology matches official "value-based" approach |
| AOV formula | HIGH | Standard e-commerce formula, no official Digistore equivalent to compare |
| Valor Liquido formula | HIGH | Internal metric, logic is sound |
| Upsell handling | HIGH | Empirically verified upsell_no distribution |
| Partial refund handling | HIGH | 25 partial refunds verified in audit, fix confirmed in code |
| Chargeback fee tracking | MEDIUM | Fees documented as separate from transaction fields, but not empirically verified |
| IPN vs API field mapping | MEDIUM | Naming conventions inferred, not all officially documented |
| Rate limits | LOW | No official documentation found |
| Dashboard computation details | MEDIUM | Official definitions found but exact formulas are not published |

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable API, unlikely to change)
