import type { Doc } from "../_generated/dataModel";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Sentinel period for one-off tasks (maps to the monthly timing bucket). */
const ONCE_PERIOD_MS = 30 * DAY_MS;

export type ReminderWindows = {
  dueSoonMs: number;
  overdueDelayMs: number;
  maxOverdueMs: number;
};

type RecurrenceFields = Pick<
  Doc<"tasks">,
  | "recurrenceType"
  | "recurrenceInterval"
  | "recurrenceUnit"
  | "recurrenceDaysOfWeek"
>;

function uniqueWeekdayCount(daysOfWeek: number[] | undefined): number {
  if (!daysOfWeek?.length) return 1;
  const set = new Set<number>();
  for (const raw of daysOfWeek) {
    if (!Number.isInteger(raw)) continue;
    if (raw < 0 || raw > 6) continue;
    set.add(raw);
  }
  return Math.max(1, set.size);
}

/**
 * Approximate cadence length used to pick reminder lead/lag windows.
 * One-off tasks use a monthly-equivalent sentinel.
 */
export function estimateRecurrencePeriodMs(task: RecurrenceFields): number {
  switch (task.recurrenceType) {
    case "daily":
      return DAY_MS;
    case "weekly":
      return 7 * DAY_MS;
    case "biweekly":
      return 14 * DAY_MS;
    case "monthly":
      return 30 * DAY_MS;
    case "once":
      return ONCE_PERIOD_MS;
    case "weeklyDays":
      return (7 * DAY_MS) / uniqueWeekdayCount(task.recurrenceDaysOfWeek);
    case "custom": {
      const n = Math.max(1, task.recurrenceInterval ?? 1);
      const unit = task.recurrenceUnit ?? "days";
      if (unit === "weeks") return n * 7 * DAY_MS;
      if (unit === "months") return n * 30 * DAY_MS;
      return n * DAY_MS;
    }
    default:
      return ONCE_PERIOD_MS;
  }
}

/**
 * Bucketed due-soon / overdue windows from approximate cadence period.
 *
 * | Period              | Due soon | Overdue after | Stop after |
 * | ≤ 1.5 days          | 30 min   | 30 min        | 12 h       |
 * | ≤ 4 days            | 2 h      | 2 h           | 1 day      |
 * | ≤ 10 days           | 6 h      | 4 h           | 2 days     |
 * | ≤ 21 days           | 1 day    | 12 h          | 3 days     |
 * | ≤ 45 days           | 1 day    | 1 day         | 5 days     |
 * | ≤ 120 days          | 2 days   | 1 day         | 7 days     |
 * | ≤ 270 days          | 2 days   | 2 days        | 10 days    |
 * | > 270 days          | 7 days   | 3 days        | 14 days    |
 */
export function reminderWindowsForPeriodMs(periodMs: number): ReminderWindows {
  if (periodMs <= 1.5 * DAY_MS) {
    return {
      dueSoonMs: 30 * MINUTE_MS,
      overdueDelayMs: 30 * MINUTE_MS,
      maxOverdueMs: 12 * HOUR_MS,
    };
  }
  if (periodMs <= 4 * DAY_MS) {
    return {
      dueSoonMs: 2 * HOUR_MS,
      overdueDelayMs: 2 * HOUR_MS,
      maxOverdueMs: DAY_MS,
    };
  }
  if (periodMs <= 10 * DAY_MS) {
    return {
      dueSoonMs: 6 * HOUR_MS,
      overdueDelayMs: 4 * HOUR_MS,
      maxOverdueMs: 2 * DAY_MS,
    };
  }
  if (periodMs <= 21 * DAY_MS) {
    return {
      dueSoonMs: DAY_MS,
      overdueDelayMs: 12 * HOUR_MS,
      maxOverdueMs: 3 * DAY_MS,
    };
  }
  if (periodMs <= 45 * DAY_MS) {
    return {
      dueSoonMs: DAY_MS,
      overdueDelayMs: DAY_MS,
      maxOverdueMs: 5 * DAY_MS,
    };
  }
  if (periodMs <= 120 * DAY_MS) {
    return {
      dueSoonMs: 2 * DAY_MS,
      overdueDelayMs: DAY_MS,
      maxOverdueMs: 7 * DAY_MS,
    };
  }
  if (periodMs <= 270 * DAY_MS) {
    return {
      dueSoonMs: 2 * DAY_MS,
      overdueDelayMs: 2 * DAY_MS,
      maxOverdueMs: 10 * DAY_MS,
    };
  }
  return {
    dueSoonMs: 7 * DAY_MS,
    overdueDelayMs: 3 * DAY_MS,
    maxOverdueMs: 14 * DAY_MS,
  };
}

export function reminderWindowsForTask(task: RecurrenceFields): ReminderWindows {
  return reminderWindowsForPeriodMs(estimateRecurrencePeriodMs(task));
}

/** Human-readable lead time for due-soon notification copy. */
export function formatDueSoonLead(dueSoonMs: number): string {
  if (dueSoonMs < HOUR_MS) {
    const minutes = Math.round(dueSoonMs / MINUTE_MS);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  if (dueSoonMs < DAY_MS) {
    const hours = Math.round(dueSoonMs / HOUR_MS);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const days = Math.round(dueSoonMs / DAY_MS);
  return days === 1 ? "1 day" : `${days} days`;
}
