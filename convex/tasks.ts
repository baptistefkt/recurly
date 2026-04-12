import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import {
  assertCanAccessTask,
  assertTeamMember,
  effectiveVisibility,
  validateAssignees,
} from "./teamAccess";

const recurrenceUnitValidator = v.optional(
  v.union(v.literal("days"), v.literal("weeks"), v.literal("months"))
);

const visibilityValidator = v.union(
  v.literal("personal"),
  v.literal("team")
);

async function enrichTasks(ctx: QueryCtx, tasks: Doc<"tasks">[]) {
  return Promise.all(
    tasks.map(async (task) => {
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
}

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    listMode: v.union(v.literal("personal"), v.literal("team")),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const includeArchived = args.includeArchived ?? false;
    let taskDocs: Doc<"tasks">[] = [];

    if (args.listMode === "personal") {
      const mine = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      taskDocs = mine.filter((t) => effectiveVisibility(t) === "personal");
    } else {
      if (!args.teamId) return [];
      await assertTeamMember(ctx, args.teamId, userId);
      const teamTasks = await ctx.db
        .query("tasks")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
        .collect();
      taskDocs = teamTasks.filter((t) => effectiveVisibility(t) === "team");
    }

    const filtered = includeArchived
      ? taskDocs
      : taskDocs.filter((t) => !t.isArchived);

    return enrichTasks(ctx, filtered);
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    try {
      await assertCanAccessTask(ctx, task, userId);
    } catch {
      return null;
    }
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
    visibility: visibilityValidator,
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.visibility === "team") {
      if (!args.teamId) throw new Error("Team tasks require a team");
      await assertTeamMember(ctx, args.teamId, userId);
      await validateAssignees(ctx, args.teamId, args.assigneeUserIds);
    } else {
      if (args.teamId) throw new Error("Personal tasks cannot have a team");
      if (args.assigneeUserIds?.length)
        throw new Error("Personal tasks cannot have assignees");
    }

    return await ctx.db.insert("tasks", {
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      recurrenceType: args.recurrenceType,
      recurrenceInterval: args.recurrenceInterval,
      recurrenceUnit: args.recurrenceUnit,
      recurrenceDayOfWeek: args.recurrenceDayOfWeek,
      color: args.color,
      userId,
      isArchived: false,
      visibility: args.visibility,
      teamId: args.teamId,
      assigneeUserIds: args.assigneeUserIds,
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
    visibility: v.optional(visibilityValidator),
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);

    const { taskId, ...rest } = args;
    const finalPatch: Partial<Doc<"tasks">> = {};

    if (rest.title !== undefined) finalPatch.title = rest.title.trim();
    if (rest.description !== undefined)
      finalPatch.description = rest.description.trim() || undefined;
    if (rest.recurrenceType !== undefined)
      finalPatch.recurrenceType = rest.recurrenceType;
    if (rest.recurrenceInterval !== undefined)
      finalPatch.recurrenceInterval = rest.recurrenceInterval;
    if (rest.recurrenceUnit !== undefined)
      finalPatch.recurrenceUnit = rest.recurrenceUnit;
    if (rest.recurrenceDayOfWeek !== undefined)
      finalPatch.recurrenceDayOfWeek = rest.recurrenceDayOfWeek;
    if (rest.color !== undefined) finalPatch.color = rest.color;

    const visOrTeamChanged =
      rest.visibility !== undefined || rest.teamId !== undefined;
    if (visOrTeamChanged) {
      const nextVis =
        rest.visibility !== undefined
          ? rest.visibility
          : effectiveVisibility(task);
      const nextTeamId =
        rest.teamId !== undefined ? rest.teamId : task.teamId;
      if (nextVis === "team") {
        if (!nextTeamId) throw new Error("Team tasks require a team");
        await assertTeamMember(ctx, nextTeamId, userId);
        finalPatch.visibility = "team";
        finalPatch.teamId = nextTeamId;
        const assignees =
          rest.assigneeUserIds !== undefined
            ? rest.assigneeUserIds
            : task.assigneeUserIds;
        await validateAssignees(ctx, nextTeamId, assignees);
        if (rest.assigneeUserIds !== undefined)
          finalPatch.assigneeUserIds = rest.assigneeUserIds;
      } else {
        finalPatch.visibility = "personal";
        finalPatch.teamId = undefined;
        finalPatch.assigneeUserIds = undefined;
      }
    } else if (rest.assigneeUserIds !== undefined) {
      if (effectiveVisibility(task) !== "team" || !task.teamId)
        throw new Error("Only team tasks have assignees");
      await validateAssignees(ctx, task.teamId, rest.assigneeUserIds);
      finalPatch.assigneeUserIds = rest.assigneeUserIds;
    }

    if (Object.keys(finalPatch).length === 0) return;
    await ctx.db.patch(taskId, finalPatch);
  },
});

export const archive = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);
    await ctx.db.patch(args.taskId, { isArchived: true });
  },
});

export const unarchive = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);
    await ctx.db.patch(args.taskId, { isArchived: false });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);
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
