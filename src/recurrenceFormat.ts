type RecurrenceFields = {
  recurrenceType: string;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceDaysOfWeek?: number[];
  dueAt?: number;
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mondayFirstOrder = (day: number) => (day + 6) % 7;

function formatWeekdayList(days: number[] | undefined): string {
  if (!days?.length) return "Selected days";
  return days
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => mondayFirstOrder(a) - mondayFirstOrder(b))
    .map((d) => WEEKDAY_NAMES[d])
    .join(", ");
}

export function humanizeRecurrence(task: RecurrenceFields): string {
  switch (task.recurrenceType) {
    case "once": {
      const at = task.dueAt;
      if (at === undefined || !Number.isFinite(at)) return "One-time";
      return `Due ${new Date(at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    }
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Every month";
    case "custom": {
      const n = task.recurrenceInterval ?? 1;
      const unit = task.recurrenceUnit ?? "days";
      const label = n === 1 ? unit.replace(/s$/, "") : unit;
      return `Every ${n} ${label}`;
    }
    case "weeklyDays":
      return `Every ${formatWeekdayList(task.recurrenceDaysOfWeek)}`;
    default:
      return task.recurrenceType;
  }
}
