import type { TransactionRow } from "../lib/transactions";
import type { PeriodFilter, PresetKey } from "../hooks/useFilters";

// ─── Digistore API Types ──────────────────────────────────────────────────────

export interface DigiAPITransaction {
  // IDs
  purchase_id:              string;
  transaction_id:           string;
  buyer_id:                 string;
  // Type & date
  transaction_type:         string;
  transaction_pay_date:     string;   // "YYYY-MM-DD HH:MM:SS" ou "YYYY-MM-DD"
  // Amounts (can be string or number from the API)
  amount:                   string | number;  // gross (buyer pays, VAT included)
  vat_amount:               string | number;  // VAT portion
  merchant_amount:          string | number;  // vendor net, before 10% retention
  affiliate_amount:         string | number;  // CPA paid to affiliate
  // earned_amount: signed — positive for payments, NEGATIVE for refunds/CB
  earned_amount:            string | number;  // vendor's real earnings (= merchant_amount)
  // transaction_amount: signed — positive for payments, NEGATIVE for refunds/CB.
  // For partial refunds, this is the actual refunded amount (not the original order total).
  transaction_amount:       string | number;
  // Upsell position: 0 = front offer, 1+ = upsell/downsell
  upsell_no:                number;
  // Product & affiliate
  main_product_name:        string;
  main_product_id:          string;
  affiliate_name:           string;
  // Country — ISO 2-letter code (e.g. "AT", "DE")
  vat_country:              string;
  currency:                 string;
  // Anything else (unused but present)
  [key: string]: unknown;
}

export interface DigiAPIPageData {
  from:             string;
  to:               string;
  page_size:        number;
  page_no:          number;
  page_count:       number;
  summary:          unknown;
  transaction_list: DigiAPITransaction[];
}

export interface DigiAPIResponse {
  api_version:  string;
  current_time: string;
  result:       "success" | "error";
  message?:     string;
  data:         DigiAPIPageData;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Parses a monetary string returned by the Digistore API.
 * Handles standard decimal "294.00" and European "1.234,56".
 */
function parseMoney(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  let s = String(v)
    .replace(/^="?|"?$/g, "")  // strip ="..." CSV wrapper if present
    .trim();

  // European thousands format: "1.234,56" → "1234.56"
  if (/\d{1,3}(?:\.\d{3})+,\d/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  // Pure comma decimal: "294,00" (no dot thousands separator)
  } else if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(",", ".");
  }
  // Standard "294.00" — parseFloat handles it directly

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function normalizeDigiTransaction(t: DigiAPITransaction): TransactionRow {
  const raw = t as unknown as Record<string, unknown>;

  const str = (...keys: string[]): string => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  // ── Date ──────────────────────────────────────────────────────────────────
  // API returns "transaction_pay_date": "2026-02-18" ou "2026-02-18 14:30:00"
  const rawDate = str("transaction_pay_date", "pay_date", "created_at");
  const date    = rawDate
    ? new Date(rawDate.slice(0, 10) + "T00:00:00Z")
    : new Date(0);

  // ── Transaction type ──────────────────────────────────────────────────────
  // Lowercase to avoid case-sensitivity bugs — Digistore may return mixed casing
  const transactionType = str("transaction_type").toLowerCase();
  const isPaymentTx = (
    transactionType === "payment" ||
    transactionType === "sale" ||
    transactionType === "upsell"
  );
  const isRefundCbTx = (
    transactionType === "refund" ||
    transactionType === "return" ||
    transactionType === "chargeback" ||
    transactionType === "reversal"
  );

  // ── Amounts ───────────────────────────────────────────────────────────────
  // For payments: grossAmount = `amount` (the sale price paid by the customer).
  // For refunds/CB: grossAmount = |transaction_amount| (the actual refunded amount).
  //   `amount` for refunds is the ORIGINAL order total — wrong for partial refunds
  //   (e.g., 30% refund of €294 → amount=294 but transaction_amount=-88.20).
  //   `transaction_amount` is signed (negative for refunds/CB) and reflects the real amount.
  // Gross REVENUE is computed by summing only payTxs — refunds don't pollute revenue totals.
  const rawAmount   = parseMoney(raw["amount"]);
  const rawTransactionAmount = parseMoney(raw["transaction_amount"]);
  const vatAmount   = parseMoney(raw["vat_amount"]);
  const grossAmount = isRefundCbTx
    ? Math.abs(rawTransactionAmount || rawAmount)  // |transaction_amount|, fallback to amount
    : rawAmount;
  const netAmount   = isPaymentTx ? rawAmount - vatAmount : 0;

  // earned_amount: correctly signed by the API — positive for payments,
  // NEGATIVE for refunds and chargebacks. Fallback to merchant_amount if absent.
  const rawEarned =
    raw["earned_amount"] !== undefined && raw["earned_amount"] !== null && raw["earned_amount"] !== ""
      ? parseMoney(raw["earned_amount"])
      : parseMoney(raw["merchant_amount"]);
  // Ensure refunds/CB always have non-positive earnings — if the fallback
  // returned a positive value for a refund, negate it.
  const earnedAmount = isRefundCbTx && rawEarned > 0 ? -rawEarned : rawEarned;

  // affiliateAmount: actual CPA paid to the affiliate for this transaction
  const affiliateAmount = parseMoney(raw["affiliate_amount"]);

  // upsell_no: 0 = front offer, 1+ = upsell/downsell position in funnel
  const upsellNo = Number(raw["upsell_no"] ?? 0);

  // ── Other fields ──────────────────────────────────────────────────────────
  return {
    date,
    orderId:         str("purchase_id", "transaction_id"),
    buyerId:         str("buyer_id"),
    transactionType,
    grossAmount,
    netAmount,
    earnings:        earnedAmount,
    // Affiliate: use affiliate_name (full name), fall back to "(direto)" for direct sales
    affiliate:       str("affiliate_name") || "(direto)",
    // Use internal product name (matches CSV naming like "M3 - Slimjara - 6 Bottles")
    productName:     str("main_product_name", "product_name"),
    productGroup:    "",
    // vat_country is already an ISO 2-letter code — costTable handles it directly
    country:         str("vat_country", "country"),
    quantity:        1,
    // New fields from logica2.md
    upsellNo,
    affiliateAmount,
    vatAmount,
  };
}

export function normalizeDigiTransactions(
  transactions: DigiAPITransaction[]
): TransactionRow[] {
  return transactions
    .filter((t) => {
      const type = String((t as unknown as Record<string, unknown>)["transaction_type"] ?? "");
      return type !== "refund_request";
    })
    .map(normalizeDigiTransaction);
}

// ─── Period → API Params ──────────────────────────────────────────────────────

export function periodToApiParams(
  period: PeriodFilter
): { from: string; to: string } {
  if (period.mode === "custom") {
    return {
      from: period.dateFrom || "-30d",
      to:   period.dateTo   || "now",
    };
  }

  const preset = period.preset as PresetKey;
  switch (preset) {
    case "today": {
      const today = new Date().toISOString().split("T")[0]!;
      return { from: today, to: today };
    }
    case "last7":
      return { from: "-7d", to: "now" };
    case "last30":
    default:
      return { from: "-30d", to: "now" };
  }
}
