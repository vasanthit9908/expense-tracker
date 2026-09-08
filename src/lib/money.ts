import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type MinorUnits = bigint;

export const MONEY_SCALE = 100n;
export const PERCENT_SCALE = 100;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function toMinorUnits(major: string | number | Decimal): MinorUnits {
  const value = new Decimal(major);
  if (!value.isFinite()) {
    throw new MoneyError("Amount is not a finite number");
  }
  if (value.lt(0)) {
    throw new MoneyError("Amount cannot be negative");
  }
  return BigInt(value.mul(100).toFixed(0, Decimal.ROUND_HALF_UP));
}

export function fromMinorUnits(minor: MinorUnits | number | string): Decimal {
  return new Decimal(minor.toString()).div(100);
}

export function roundToMinor(value: Decimal): MinorUnits {
  if (value.lt(0)) {
    const abs = BigInt(value.abs().toFixed(0, Decimal.ROUND_HALF_UP));
    return -abs;
  }
  return BigInt(value.toFixed(0, Decimal.ROUND_HALF_UP));
}

export function addMinor(...values: MinorUnits[]): MinorUnits {
  return values.reduce((sum, value) => sum + value, 0n);
}

export function subMinor(left: MinorUnits, right: MinorUnits): MinorUnits {
  return left - right;
}

export function toStoredPercent(percent: string | number | Decimal): number {
  const value = new Decimal(percent);
  if (!value.isFinite()) {
    throw new MoneyError("Percentage is not a finite number");
  }
  return Number(value.mul(PERCENT_SCALE).toFixed(0, Decimal.ROUND_HALF_UP));
}

export function fromStoredPercent(stored: number): Decimal {
  return new Decimal(stored).div(PERCENT_SCALE);
}

export function assertPositiveAmount(minor: MinorUnits, label: string): void {
  if (minor < 0n) {
    throw new MoneyError(`${label} cannot be negative`);
  }
}

export function percentOf(amountMinor: MinorUnits, percent: Decimal): MinorUnits {
  const result = new Decimal(amountMinor.toString()).mul(percent).div(100);
  return roundToMinor(result);
}

export function allocateByPercentages(
  amountMinor: MinorUnits,
  percentages: Decimal[],
): MinorUnits[] {
  if (percentages.length === 0) {
    return [];
  }
  const parts: MinorUnits[] = [];
  let allocated = 0n;
  for (let index = 0; index < percentages.length; index += 1) {
    if (index === percentages.length - 1) {
      parts.push(amountMinor - allocated);
    } else {
      const part = percentOf(amountMinor, percentages[index]!);
      parts.push(part);
      allocated += part;
    }
  }
  return parts;
}

export function assertPercentSum100(percentages: Decimal[]): void {
  const sum = percentages.reduce((acc, value) => acc.plus(value), new Decimal(0));
  if (!sum.eq(100)) {
    throw new MoneyError(`Allocation percentages must equal 100% (got ${sum.toString()}%)`);
  }
}

/** Parse a positive exchange rate (base currency units per 1 transaction-currency unit). */
export function parseExchangeRate(rate: string | number | Decimal): Decimal {
  const value = new Decimal(rate);
  if (!value.isFinite() || value.lte(0)) {
    throw new MoneyError("Exchange rate must be a positive number");
  }
  return value;
}

/**
 * Book an expense into the organisation base currency.
 * `exchangeRate` = units of base currency per 1 unit of transaction currency.
 * Example: INR → USD at 0.012 means ₹1,000 books as $12.
 */
export function bookToBaseCurrency(
  originalMinor: MinorUnits,
  exchangeRate: string | number | Decimal,
): MinorUnits {
  const rate = parseExchangeRate(exchangeRate);
  return roundToMinor(new Decimal(originalMinor.toString()).mul(rate));
}

export function normalizeExpenseFx(input: {
  transactionCurrency: string;
  baseCurrency: string;
  originalMajor: string | number | Decimal;
  exchangeRate?: string | number | Decimal | null;
}): {
  currency: string;
  originalAmountMinor: MinorUnits;
  exchangeRate: string;
  amountMinor: MinorUnits;
} {
  const currency = input.transactionCurrency.toUpperCase();
  const base = input.baseCurrency.toUpperCase();
  const originalAmountMinor = toMinorUnits(input.originalMajor);
  assertPositiveAmount(originalAmountMinor, "Original amount");

  if (currency === base) {
    return {
      currency,
      originalAmountMinor,
      exchangeRate: "1",
      amountMinor: originalAmountMinor,
    };
  }

  if (input.exchangeRate == null || String(input.exchangeRate).trim() === "") {
    throw new MoneyError(
      `Exchange rate is required when expense currency (${currency}) differs from organisation currency (${base})`,
    );
  }

  const rate = parseExchangeRate(input.exchangeRate);
  return {
    currency,
    originalAmountMinor,
    exchangeRate: rate.toString(),
    amountMinor: bookToBaseCurrency(originalAmountMinor, rate),
  };
}
