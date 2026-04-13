import type { Doc } from "./_generated/dataModel";

export function normalizeWeekdays(input: number[] | undefined): number[] {
  if (!input?.length) return [];
  const set = new Set<number>();
  for (const raw of input) {
    if (!Number.isInteger(raw)) continue;
    if (raw < 0 || raw > 6) continue;
    set.add(raw);
  }
  return [...set].sort((a, b) => a - b);
}

export function computeNextDue(
  task: Pick<
    Doc<"tasks">,
    | "recurrenceType"
    | "recurrenceInterval"
    | "recurrenceUnit"
    | "recurrenceDayOfWeek"
    | "recurrenceDaysOfWeek"
  >,
  lastCompletedAt: number | null,
  taskCreationTime: number
): number | null {
  const base = lastCompletedAt ?? taskCreationTime;
  const d = new Date(base);

  switch (task.recurrenceType) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "custom": {
      const n = task.recurrenceInterval ?? 1;
      const unit = task.recurrenceUnit ?? "days";
      if (unit === "days") d.setDate(d.getDate() + n);
      else if (unit === "weeks") d.setDate(d.getDate() + n * 7);
      else if (unit === "months") d.setMonth(d.getMonth() + n);
      break;
    }
    case "weeklyDays": {
      const weekdays = normalizeWeekdays(task.recurrenceDaysOfWeek);
      if (weekdays.length === 0) return null;
      const current = d.getDay();
      for (let i = 1; i <= 7; i++) {
        const candidate = (current + i) % 7;
        if (weekdays.includes(candidate)) {
          d.setDate(d.getDate() + i);
          return d.getTime();
        }
      }
      return null;
    }
    default:
      return null;
  }
  return d.getTime();
}
