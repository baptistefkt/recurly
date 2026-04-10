import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const recurrenceUnitValidator = v.optional(
  v.union(v.literal("days"), v.literal("weeks"), v.literal("months"))
);

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const filtered = args.includeArchived
      ? tasks
      : tasks.filter((t) => !t.isArchived);

    const tasksWithCompletion = await Promise.all(
      filtered.map(async (task) => {
        const lastCompletion = await ctx.db
          .query("completions")
          .withIndex("by_task_and_time", (q) => q.eq("taskId", task._id))
          .order("desc")
          .first();

        const completionCount = await ctx.db
          .query("completions")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        return {
          ...task,
          lastCompletedAt: lastCompletion?.completedAt ?? null,
          completionCount: completionCount.length,
          nextDueAt: computeNextDue(task, lastCompletion?.completedAt ?? null),
        };
      })
    );

    return tasksWithCompletion;
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) return null;
    return task;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    recurrenceType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("custom")
    ),
    recurrenceInterval: v.optional(v.number()),
    recurrenceUnit: recurrenceUnitValidator,
    recurrenceDayOfWeek: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("tasks", {
      ...args,
      userId,
      isArchived: false,
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    recurrenceType: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("monthly"),
        v.literal("custom")
      )
    ),
    recurrenceInterval: v.optional(v.number()),
    recurrenceUnit: recurrenceUnitValidator,
    recurrenceDayOfWeek: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { taskId, ...rest } = args;
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(taskId, rest);
  },
});

export const archive = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.taskId, { isArchived: true });
  },
});

export const unarchive = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.taskId, { isArchived: false });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) throw new Error("Not found");
    const completions = await ctx.db
      .query("completions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const c of completions) {
      await ctx.db.delete(c._id);
    }
    await ctx.db.delete(args.taskId);
  },
});

function computeNextDue(
  task: {
    recurrenceType: string;
    recurrenceInterval?: number;
    recurrenceUnit?: string;
    recurrenceDayOfWeek?: number;
  },
  lastCompletedAt: number | null
): number | null {
  const base = lastCompletedAt ?? Date.now();
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
    default:
      return null;
  }
  return d.getTime();
}
