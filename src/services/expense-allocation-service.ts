import Decimal from "decimal.js";
import { allocateByPercentages, assertPercentSum100, type MinorUnits } from "@/lib/money";

export function computeExpenseAllocations(
  amountMinor: MinorUnits,
  percentages: Array<string | number | Decimal>,
): MinorUnits[] {
  const values = percentages.map((value) => new Decimal(value));
  assertPercentSum100(values);
  return allocateByPercentages(amountMinor, values);
}
