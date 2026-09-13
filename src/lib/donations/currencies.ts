// Multi-country donation support: donors pick their own currency from this
// allow-list rather than everything being forced through USD. This list is a
// starting set, not exhaustive — extend it if real donors ask for a currency
// that's missing. See docs/MONETIZATION.md §2.
//
// minAmountCents is a rough floor per currency (Stripe enforces its own
// per-currency minimums too; this is just a sane UI-level floor so the form
// doesn't offer, say, "5 yen").
export const SUPPORTED_CURRENCIES = [
  { code: "usd", label: "US Dollar", symbol: "$", minAmountCents: 100 },
  { code: "gbp", label: "British Pound", symbol: "£", minAmountCents: 100 },
  { code: "eur", label: "Euro", symbol: "€", minAmountCents: 100 },
  { code: "cad", label: "Canadian Dollar", symbol: "CA$", minAmountCents: 150 },
  { code: "aud", label: "Australian Dollar", symbol: "AU$", minAmountCents: 150 },
  { code: "aed", label: "UAE Dirham", symbol: "AED", minAmountCents: 400 },
  { code: "sar", label: "Saudi Riyal", symbol: "SAR", minAmountCents: 400 },
  { code: "pkr", label: "Pakistani Rupee", symbol: "Rs", minAmountCents: 25000 },
  { code: "inr", label: "Indian Rupee", symbol: "₹", minAmountCents: 8000 },
  { code: "myr", label: "Malaysian Ringgit", symbol: "RM", minAmountCents: 400 },
  { code: "idr", label: "Indonesian Rupiah", symbol: "Rp", minAmountCents: 1500000 },
  { code: "zar", label: "South African Rand", symbol: "R", minAmountCents: 1800 },
  { code: "try", label: "Turkish Lira", symbol: "₺", minAmountCents: 3000 },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];

export function getCurrency(code: string) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

// Absolute ceiling regardless of currency, to cap fraud/error blast radius on
// a single charge — see docs/MONETIZATION.md §4 and the pre-launch checklist.
// Expressed per-currency as a multiple of that currency's minimum, since a
// flat cents number means wildly different real amounts across currencies.
export const MAX_AMOUNT_MULTIPLE_OF_MIN = 5000;
