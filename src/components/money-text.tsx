import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function MoneyText({
  minor,
  currency,
  className,
  signed = false,
}: {
  minor: bigint | number;
  currency: string;
  className?: string;
  signed?: boolean;
}) {
  const value = typeof minor === "bigint" ? minor : BigInt(minor);
  const formatted = formatMoney(value, currency);
  const negative = value < 0n;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        signed && negative && "text-destructive",
        signed && !negative && value > 0n && "text-emerald-700",
        className,
      )}
    >
      {formatted}
    </span>
  );
}
