import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  getDaysInMonth,
  isBefore,
  isValid,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";

export type IsoDate = string;

export type DateRange = {
  start: IsoDate;
  end: IsoDate;
};

export type MonthSlice = {
  year: number;
  month: number;
  start: IsoDate;
  end: IsoDate;
  daysInMonth: number;
  activeDays: number;
};

export function toIsoDate(date: Date): IsoDate {
  return format(date, "yyyy-MM-dd");
}

export function parseIsoDate(value: string): Date {
  const date = parseISO(value);
  if (!isValid(date) || toIsoDate(date) !== value) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return date;
}

export function isIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

export function assertDateOrder(start: string, end: string | null | undefined, message: string): void {
  if (!end) {
    return;
  }
  if (isBefore(parseIsoDate(end), parseIsoDate(start))) {
    throw new Error(message);
  }
}

export function inclusiveDays(start: IsoDate, end: IsoDate): number {
  return differenceInCalendarDays(parseIsoDate(end), parseIsoDate(start)) + 1;
}

export function maxDate(left: IsoDate, right: IsoDate): IsoDate {
  return left >= right ? left : right;
}

export function minDate(left: IsoDate, right: IsoDate): IsoDate {
  return left <= right ? left : right;
}

export function intersectRanges(
  aStart: IsoDate,
  aEnd: IsoDate,
  bStart: IsoDate,
  bEnd: IsoDate,
): DateRange | null {
  const start = maxDate(aStart, bStart);
  const end = minDate(aEnd, bEnd);
  if (start > end) {
    return null;
  }
  return { start, end };
}

export function openEnd(end: IsoDate | null | undefined, fallback: IsoDate): IsoDate {
  return end ?? fallback;
}

export function addOneDay(date: IsoDate): IsoDate {
  return toIsoDate(addDays(parseIsoDate(date), 1));
}

export function iterateMonthSlices(rangeStart: IsoDate, rangeEnd: IsoDate): MonthSlice[] {
  const slices: MonthSlice[] = [];
  let cursor = startOfMonth(parseIsoDate(rangeStart));
  const last = parseIsoDate(rangeEnd);

  while (!isBefore(last, cursor)) {
    const monthStart = toIsoDate(cursor);
    const monthEnd = toIsoDate(endOfMonth(cursor));
    const overlap = intersectRanges(rangeStart, rangeEnd, monthStart, monthEnd);
    if (overlap) {
      slices.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1,
        start: overlap.start,
        end: overlap.end,
        daysInMonth: getDaysInMonth(cursor),
        activeDays: inclusiveDays(overlap.start, overlap.end),
      });
    }
    cursor = addDays(endOfMonth(cursor), 1);
  }

  return slices;
}

export type PeriodPreset =
  | "current_month"
  | "previous_month"
  | "current_quarter"
  | "previous_quarter"
  | "current_year"
  | "previous_year"
  | "custom";

export function periodFromPreset(preset: PeriodPreset, now = new Date()): DateRange {
  switch (preset) {
    case "current_month":
      return { start: toIsoDate(startOfMonth(now)), end: toIsoDate(endOfMonth(now)) };
    case "previous_month": {
      const previous = subMonths(now, 1);
      return { start: toIsoDate(startOfMonth(previous)), end: toIsoDate(endOfMonth(previous)) };
    }
    case "current_quarter":
      return { start: toIsoDate(startOfQuarter(now)), end: toIsoDate(endOfQuarter(now)) };
    case "previous_quarter": {
      const previous = subQuarters(now, 1);
      return { start: toIsoDate(startOfQuarter(previous)), end: toIsoDate(endOfQuarter(previous)) };
    }
    case "current_year":
      return { start: toIsoDate(startOfYear(now)), end: toIsoDate(endOfYear(now)) };
    case "previous_year": {
      const previous = subYears(now, 1);
      return { start: toIsoDate(startOfYear(previous)), end: toIsoDate(endOfYear(previous)) };
    }
    case "custom":
      return { start: toIsoDate(startOfMonth(now)), end: toIsoDate(endOfMonth(now)) };
    default:
      return { start: toIsoDate(startOfMonth(now)), end: toIsoDate(endOfMonth(now)) };
  }
}

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "current_month", label: "Current month" },
  { value: "previous_month", label: "Previous month" },
  { value: "current_quarter", label: "Current quarter" },
  { value: "previous_quarter", label: "Previous quarter" },
  { value: "current_year", label: "Current year" },
  { value: "previous_year", label: "Previous year" },
  { value: "custom", label: "Custom range" },
];
