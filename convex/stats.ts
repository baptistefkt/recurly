import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { assertTeamMember } from "./teamAccess";

const rangeValidator = v.union(
  v.literal("7d"),
  v.literal("30d"),
  v.literal("90d"),
  v.literal("all")
);

const MIN_TASK_POINTS = 1;
const MAX_TASK_POINTS = 5;

type RangeValue = "7d" | "30d" | "90d" | "all";

function getRangeStartAt(range: RangeValue, now: number): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  if (range === "7d") return now - 7 * DAY_MS;
  if (range === "30d") return now - 30 * DAY_MS;
  if (range === "90d") return now - 90 * DAY_MS;
  return 0;
}

function pointsForTask(task: Doc<"tasks">): number {
  const p = task.points;
  if (p === undefined) return MIN_TASK_POINTS;
  if (!Number.isInteger(p)) return MIN_TASK_POINTS;
  if (p < MIN_TASK_POINTS || p > MAX_TASK_POINTS) return MIN_TASK_POINTS;
  return p;
}

function trendBucketKey(completedAt: number, range: RangeValue): string {
  const d = new Date(completedAt);
  if (range === "all") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function buildTrendBuckets(
  range: RangeValue,
  rangeStartAt: number,
  now: number,
  observedBuckets: string[]
): string[] {
  if (range === "all") {
    if (observedBuckets.length === 0) return [];
    const sortedObserved = [...observedBuckets].sort();
    const [startYearRaw, startMonthRaw] = sortedObserved[0].split("-");
    const startYear = Number(startYearRaw);
    const startMonth = Number(startMonthRaw);
    if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return sortedObserved;

    const start = Date.UTC(startYear, startMonth - 1, 1);
    const endDate = new Date(now);
    const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1);
    const buckets: string[] = [];

    for (let cursor = start; cursor <= end; ) {
      const d = new Date(cursor);
      buckets.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
      cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }
    return buckets;
  }

  const start = startOfUtcDay(rangeStartAt);
  const end = startOfUtcDay(now);
  const buckets: string[] = [];

  for (let cursor = start; cursor <= end; cursor += 24 * 60 * 60 * 1000) {
    buckets.push(new Date(cursor).toISOString().slice(0, 10));
  }

  return buckets;
}

export const overview = query({
  args: {
    range: rangeValidator,
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        range: args.range,
        rangeStartAt: 0,
        rangeEndAt: 0,
        personal: {
          completedPoints: 0,
          completionCount: 0,
          averagePointsPerCompletion: 0,
          onTimeCompletionRate: null as number | null,
          onTimeEligibleCount: 0,
          onTimeCount: 0,
          trend: [] as { bucket: string; completedPoints: number; completionCount: number }[],
        },
        team: null as null,
      };
    }

    const now = Date.now();
    const rangeStartAt = getRangeStartAt(args.range, now);
    const selectedTeamId = args.teamId ?? null;

    const taskCache = new Map<Id<"tasks">, Doc<"tasks"> | null>();
    const getTask = async (taskId: Id<"tasks">) => {
      if (taskCache.has(taskId)) return taskCache.get(taskId)!;
      const task = await ctx.db.get(taskId);
      taskCache.set(taskId, task);
      return task;
    };

    const myCompletions = await ctx.db
      .query("completions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let personalCompletedPoints = 0;
    let personalCompletionCount = 0;
    let onTimeEligibleCount = 0;
    let onTimeCount = 0;
    const trendByBucket = new Map<string, { completedPoints: number; completionCount: number }>();

    for (const completion of myCompletions) {
      if (completion.completedAt < rangeStartAt || completion.completedAt > now) continue;
      const task = await getTask(completion.taskId);
      if (!task) continue;
      if (selectedTeamId !== null && task.teamId !== selectedTeamId) continue;
      const points = pointsForTask(task);
      personalCompletedPoints += points;
      personalCompletionCount += 1;

      const bucket = trendBucketKey(completion.completedAt, args.range);
      const current = trendByBucket.get(bucket) ?? { completedPoints: 0, completionCount: 0 };
      current.completedPoints += points;
      current.completionCount += 1;
      trendByBucket.set(bucket, current);

      if (task.recurrenceType === "once" && task.dueAt !== undefined) {
        onTimeEligibleCount += 1;
        if (completion.completedAt <= task.dueAt) onTimeCount += 1;
      }
    }

    const personal = {
      completedPoints: personalCompletedPoints,
      completionCount: personalCompletionCount,
      averagePointsPerCompletion:
        personalCompletionCount > 0 ? personalCompletedPoints / personalCompletionCount : 0,
      onTimeCompletionRate:
        onTimeEligibleCount > 0 ? onTimeCount / onTimeEligibleCount : (null as number | null),
      onTimeEligibleCount,
      onTimeCount,
      trend: buildTrendBuckets(args.range, rangeStartAt, now, [...trendByBucket.keys()]).map(
        (bucket) => {
          const value = trendByBucket.get(bucket) ?? { completedPoints: 0, completionCount: 0 };
          return { bucket, ...value };
        }
      ),
    };

    if (!selectedTeamId) {
      return {
        range: args.range,
        rangeStartAt,
        rangeEndAt: now,
        personal,
        team: null as null,
      };
    }

    await assertTeamMember(ctx, selectedTeamId, userId);
    const team = await ctx.db.get(selectedTeamId);

    const memberRows = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", selectedTeamId))
      .collect();

    const memberIds = memberRows.map((row) => row.userId);
    const memberById = new Map<
      Id<"users">,
      {
        userId: Id<"users">;
        name: string | null;
        email: string | null;
        image: string | null;
        role: "admin" | "member";
        completedPoints: number;
        completionCount: number;
        openAssignedPoints: number;
      }
    >();

    await Promise.all(
      memberRows.map(async (row) => {
        const u = await ctx.db.get(row.userId);
        memberById.set(row.userId, {
          userId: row.userId,
          name: u?.name ?? null,
          email: u?.email ?? null,
          image: u?.image ?? null,
          role: row.role,
          completedPoints: 0,
          completionCount: 0,
          openAssignedPoints: 0,
        });
      })
    );

    const teamTasks = await ctx.db
      .query("tasks")
      .withIndex("by_team", (q) => q.eq("teamId", selectedTeamId))
      .collect();

    const tagPoints = new Map<string, number>();
    let oncePoints = 0;
    let recurringPoints = 0;

    for (const task of teamTasks) {
      const points = pointsForTask(task);

      if (!task.isArchived) {
        const assignees =
          task.assigneeUserIds && task.assigneeUserIds.length > 0
            ? task.assigneeUserIds
            : [task.userId];
        for (const assigneeId of assignees) {
          const agg = memberById.get(assigneeId);
          if (agg) agg.openAssignedPoints += points;
        }
      }

      const completions = await ctx.db
        .query("completions")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

      for (const completion of completions) {
        if (completion.completedAt < rangeStartAt || completion.completedAt > now) continue;
        const agg = memberById.get(completion.userId);
        if (!agg) continue;

        agg.completedPoints += points;
        agg.completionCount += 1;

        if (task.recurrenceType === "once") {
          oncePoints += points;
        } else {
          recurringPoints += points;
        }

        for (const tag of task.tags ?? []) {
          tagPoints.set(tag, (tagPoints.get(tag) ?? 0) + points);
        }
      }
    }

    const members = [...memberById.values()]
      .map((member) => ({
        ...member,
        outputSharePercent: 0,
      }))
      .sort((a, b) => b.completedPoints - a.completedPoints);

    const totalCompletedPoints = members.reduce((sum, m) => sum + m.completedPoints, 0);
    const totalCompletions = members.reduce((sum, m) => sum + m.completionCount, 0);
    const totalOpenAssignedPoints = members.reduce((sum, m) => sum + m.openAssignedPoints, 0);

    for (const member of members) {
      member.outputSharePercent =
        totalCompletedPoints > 0 ? (member.completedPoints / totalCompletedPoints) * 100 : 0;
    }

    const activeCompleted = members
      .map((m) => m.completedPoints)
      .filter((points) => points > 0)
      .sort((a, b) => a - b);
    const balanceRatio =
      activeCompleted.length >= 2
        ? activeCompleted[activeCompleted.length - 1] / activeCompleted[0]
        : null;

    return {
      range: args.range,
      rangeStartAt,
      rangeEndAt: now,
      personal,
      team: {
        teamId: selectedTeamId,
        teamName: team?.name ?? "Team",
        memberCount: memberIds.length,
        totalCompletedPoints,
        totalCompletions,
        totalOpenAssignedPoints,
        balanceRatio,
        members,
        tagBreakdown: [...tagPoints.entries()]
          .map(([tag, completedPoints]) => ({ tag, completedPoints }))
          .sort((a, b) => b.completedPoints - a.completedPoints)
          .slice(0, 10),
        recurrenceBreakdown: {
          oncePoints,
          recurringPoints,
        },
      },
    };
  },
});
