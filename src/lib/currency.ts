export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number] | string;

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}

export function formatMoney(minorUnits: bigint | number, currency: string): string {
  const major = Number(minorUnits) / 100;
  const locale = LOCALES[currency] ?? "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${currencySymbol(currency)}${formatted}`;
}

export function formatPercent(value: number | string): string {
  const numeric = Number(value);
  if (Number.isInteger(numeric)) {
    return `${numeric}%`;
  }
  return `${numeric.toFixed(2)}%`;
}
