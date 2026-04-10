export type DueGroup =
  | "overdue"
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "nextWeek"
  | "thisMonth"
  | "nextMonth"
  | "later";

export const DUE_GROUP_ORDER: DueGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
  "thisMonth",
  "nextMonth",
  "later",
];

export const DUE_GROUP_LABEL: Record<DueGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This week",
  nextWeek: "Next week",
  thisMonth: "This month",
  nextMonth: "Next month",
  later: "Later",
};

function startOfDayMs(refMs: number): number {
  const d = new Date(refMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addCalendarDaysMs(dayStartMs: number, days: number): number {
  const d = new Date(dayStartMs);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 local for the week that contains refMs. */
function startOfWeekMondayMs(refMs: number): number {
  const d = new Date(refMs);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const offsetFromMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offsetFromMonday);
  return d.getTime();
}

function endOfWeekSundayEndMs(refMs: number): number {
  const start = startOfWeekMondayMs(refMs);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function startOfNextWeekMondayMs(refMs: number): number {
  return addCalendarDaysMs(startOfWeekMondayMs(refMs), 7);
}

function endOfNextWeekSundayEndMs(refMs: number): number {
  return endOfWeekSundayEndMs(startOfNextWeekMondayMs(refMs));
}

/** First calendar day (00:00) after the Sunday that ends “next week”. */
function firstDayAfterNextWeekMs(refMs: number): number {
  return addCalendarDaysMs(startOfDayMs(endOfNextWeekSundayEndMs(refMs)), 1);
}

function sameCalendarMonthYear(dueDayStart: number, refMs: number): boolean {
  const a = new Date(dueDayStart);
  const b = new Date(refMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function startOfNextCalendarMonthMs(refMs: number): number {
  const n = new Date(refMs);
  return new Date(n.getFullYear(), n.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

/** Start of the last day of the calendar month after refMs’s month. */
function startOfLastDayOfNextCalendarMonthMs(refMs: number): number {
  const n = new Date(refMs);
  return new Date(n.getFullYear(), n.getMonth() + 2, 0, 0, 0, 0, 0).getTime();
}

/**
 * Calendar-based groups (local timezone). Week = Monday–Sunday.
 * Order: Overdue → Today → Tomorrow → rest of this week → next week →
 * remainder of this calendar month → entire next calendar month → Later.
 */
export function getDueGroup(nextDueAt: number | null, nowMs: number): DueGroup {
  if (nextDueAt === null) return "later";

  const dueDay = startOfDayMs(nextDueAt);
  const today = startOfDayMs(nowMs);
  const tomorrow = addCalendarDaysMs(today, 1);

  if (dueDay < today) return "overdue";
  if (dueDay === today) return "today";
  if (dueDay === tomorrow) return "tomorrow";

  const dayAfterTomorrow = addCalendarDaysMs(tomorrow, 1);
  const thisWeekSunday = startOfDayMs(endOfWeekSundayEndMs(nowMs));
  if (dueDay >= dayAfterTomorrow && dueDay <= thisWeekSunday) return "thisWeek";

  const nextWeekMonday = startOfNextWeekMondayMs(nowMs);
  const nextWeekSunday = startOfDayMs(endOfNextWeekSundayEndMs(nowMs));
  if (dueDay >= nextWeekMonday && dueDay <= nextWeekSunday) return "nextWeek";

  const afterNextWeek = firstDayAfterNextWeekMs(nowMs);
  const thisMonthLastDay = new Date(
    new Date(nowMs).getFullYear(),
    new Date(nowMs).getMonth() + 1,
    0,
    0,
    0,
    0,
    0
  ).getTime();

  if (
    dueDay >= afterNextWeek &&
    dueDay <= thisMonthLastDay &&
    sameCalendarMonthYear(dueDay, nowMs)
  ) {
    return "thisMonth";
  }

  const nextMonthStart = startOfNextCalendarMonthMs(nowMs);
  const nextMonthLastDay = startOfLastDayOfNextCalendarMonthMs(nowMs);
  if (dueDay >= nextMonthStart && dueDay <= nextMonthLastDay) return "nextMonth";

  return "later";
}

export function groupTasksByDueGroup<T extends { nextDueAt: number | null }>(
  tasks: T[],
  nowMs: number
): Array<{ group: DueGroup; tasks: T[] }> {
  const buckets: Record<DueGroup, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    thisMonth: [],
    nextMonth: [],
    later: [],
  };
  for (const t of tasks) {
    buckets[getDueGroup(t.nextDueAt, nowMs)].push(t);
  }
  return DUE_GROUP_ORDER.filter((g) => buckets[g].length > 0).map((g) => ({
    group: g,
    tasks: buckets[g],
  }));
}
