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
    | "dueAt"
    | "recurrenceStartAt"
    | "recurrenceEndAt"
    | "recurrenceInterval"
    | "recurrenceUnit"
    | "recurrenceDayOfWeek"
    | "recurrenceDaysOfWeek"
  >,
  lastCompletedAt: number | null,
  taskCreationTime: number
): number | null {
  const startAt =
    task.recurrenceStartAt !== undefined && Number.isFinite(task.recurrenceStartAt)
      ? task.recurrenceStartAt
      : undefined;
  const endAt =
    task.recurrenceEndAt !== undefined && Number.isFinite(task.recurrenceEndAt)
      ? task.recurrenceEndAt
      : undefined;

  const withinWindow = (dueAt: number | null): number | null => {
    if (dueAt === null) return null;
    if (endAt !== undefined && dueAt > endAt) return null;
    return dueAt;
  };

  if (task.recurrenceType === "once") {
    if (lastCompletedAt !== null) return null;
    const at = task.dueAt;
    return at !== undefined && Number.isFinite(at) ? withinWindow(at) : null;
  }

  if (startAt !== undefined && endAt !== undefined && startAt > endAt) return null;
  const base =
    lastCompletedAt !== null
      ? Math.max(lastCompletedAt, startAt ?? lastCompletedAt)
      : (startAt ?? taskCreationTime);
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
          return withinWindow(d.getTime());
        }
      }
      return null;
    }
    default:
      return null;
  }
  return withinWindow(d.getTime());
}
