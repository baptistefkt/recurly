import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertCanAccessTask,
  assertTeamMember,
  effectiveVisibility,
  validateAssignees,
} from "./teamAccess";
import { computeNextDue, normalizeWeekdays } from "./recurrence";

const recurrenceUnitValidator = v.optional(
  v.union(v.literal("days"), v.literal("weeks"), v.literal("months"))
);
const recurrenceDaysOfWeekValidator = v.optional(v.array(v.number()));

const visibilityValidator = v.union(
  v.literal("personal"),
  v.literal("team")
);

const MAX_TAG_LEN = 40;
const MAX_TAG_COUNT = 20;

function normalizeTags(input: string[] | undefined): string[] {
  if (!input?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.trim().slice(0, MAX_TAG_LEN);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAG_COUNT) break;
  }
  return out;
}

async function collectAccessibleTaskDocs(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"tasks">[]> {
  const mine = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const personal = mine.filter((t) => effectiveVisibility(t) === "personal");

  const memberRows = await ctx.db
    .query("teamMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const teamTaskLists = await Promise.all(
    memberRows.map(async (row) => {
      const teamTasks = await ctx.db
        .query("tasks")
        .withIndex("by_team", (q) => q.eq("teamId", row.teamId))
        .collect();
      return teamTasks.filter((t) => effectiveVisibility(t) === "team");
    })
  );

  const byId = new Map<string, Doc<"tasks">>();
  for (const t of personal) byId.set(t._id, t);
  for (const list of teamTaskLists) {
    for (const t of list) byId.set(t._id, t);
  }
  return [...byId.values()];
}

async function enrichSingleTask(
  ctx: QueryCtx,
  task: Doc<"tasks">,
  userById: Map<Id<"users">, Doc<"users"> | null>
) {
  const lastCompletion = await ctx.db
    .query("completions")
    .withIndex("by_task_and_time", (q) => q.eq("taskId", task._id))
    .order("desc")
    .first();

  const completionRows = await ctx.db
    .query("completions")
    .withIndex("by_task", (q) => q.eq("taskId", task._id))
    .collect();

  const assignees =
    task.assigneeUserIds?.map((uid) => {
      const u = userById.get(uid);
      return {
        userId: uid,
        name: u?.name ?? null,
        email: u?.email ?? null,
        image: u?.image ?? null,
      };
    }) ?? [];

  const creatorUser = userById.get(task.userId);
  const createdBy = {
    userId: task.userId,
    name: creatorUser?.name ?? null,
    email: creatorUser?.email ?? null,
    image: creatorUser?.image ?? null,
  };

  let teamName: string | null = null;
  if (task.teamId) {
    const team = await ctx.db.get(task.teamId);
    teamName = team?.name ?? null;
  }

  return {
    ...task,
    lastCompletedAt: lastCompletion?.completedAt ?? null,
    completionCount: completionRows.length,
    nextDueAt: computeNextDue(
      task,
      lastCompletion?.completedAt ?? null,
      task._creationTime
    ),
    assignees,
    createdBy,
    teamName,
  };
}

async function enrichTasks(ctx: QueryCtx, tasks: Doc<"tasks">[]) {
  const userIdSet = new Set<Id<"users">>();
  for (const t of tasks) {
    userIdSet.add(t.userId);
    for (const id of t.assigneeUserIds ?? []) {
      userIdSet.add(id);
    }
  }
  const userById = new Map<Id<"users">, Doc<"users"> | null>();
  await Promise.all(
    [...userIdSet].map(async (id) => {
      userById.set(id, await ctx.db.get(id));
    })
  );

  return Promise.all(tasks.map((task) => enrichSingleTask(ctx, task, userById)));
}

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    listMode: v.union(
      v.literal("personal"),
      v.literal("team"),
      v.literal("all")
    ),
    teamId: v.optional(v.id("teams")),
    tagFilter: v.optional(v.string()),
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
    } else if (args.listMode === "team") {
      if (!args.teamId) return [];
      await assertTeamMember(ctx, args.teamId, userId);
      const teamTasks = await ctx.db
        .query("tasks")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
        .collect();
      taskDocs = teamTasks.filter((t) => effectiveVisibility(t) === "team");
    } else {
      taskDocs = await collectAccessibleTaskDocs(ctx, userId);
    }

    const filtered = includeArchived
      ? taskDocs
      : taskDocs.filter((t) => !t.isArchived);

    const tagNeedle = args.tagFilter?.trim().toLowerCase();
    const afterTag =
      tagNeedle && tagNeedle.length > 0
        ? filtered.filter((t) =>
            (t.tags ?? []).some((tag) => tag.toLowerCase() === tagNeedle)
          )
        : filtered;

    return enrichTasks(ctx, afterTag);
  },
});

export const distinctTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const taskDocs = await collectAccessibleTaskDocs(ctx, userId);
    const canonToDisplay = new Map<string, string>();
    for (const task of taskDocs) {
      for (const tag of task.tags ?? []) {
        const t = tag.trim().slice(0, MAX_TAG_LEN);
        if (!t) continue;
        const key = t.toLowerCase();
        if (!canonToDisplay.has(key)) canonToDisplay.set(key, t);
      }
    }
    const labels = [...canonToDisplay.values()];
    labels.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return labels;
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

    const userIdSet = new Set<Id<"users">>([task.userId]);
    for (const id of task.assigneeUserIds ?? []) {
      userIdSet.add(id);
    }
    const userById = new Map<Id<"users">, Doc<"users"> | null>();
    await Promise.all(
      [...userIdSet].map(async (id) => {
        userById.set(id, await ctx.db.get(id));
      })
    );

    return enrichSingleTask(ctx, task, userById);
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
      v.literal("custom"),
      v.literal("weeklyDays")
    ),
    recurrenceInterval: v.optional(v.number()),
    recurrenceUnit: recurrenceUnitValidator,
    recurrenceDayOfWeek: v.optional(v.number()),
    recurrenceDaysOfWeek: recurrenceDaysOfWeekValidator,
    visibility: visibilityValidator,
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
    tags: v.optional(v.array(v.string())),
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

    const tags = normalizeTags(args.tags);
    const recurrenceDaysOfWeek =
      args.recurrenceType === "weeklyDays"
        ? normalizeWeekdays(args.recurrenceDaysOfWeek)
        : [];
    if (args.recurrenceType === "weeklyDays" && recurrenceDaysOfWeek.length === 0) {
      throw new Error("Pick at least one weekday");
    }
    return await ctx.db.insert("tasks", {
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      recurrenceType: args.recurrenceType,
      recurrenceInterval: args.recurrenceInterval,
      recurrenceUnit: args.recurrenceUnit,
      recurrenceDayOfWeek: args.recurrenceDayOfWeek,
      recurrenceDaysOfWeek:
        recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
      userId,
      isArchived: false,
      visibility: args.visibility,
      teamId: args.teamId,
      assigneeUserIds: args.assigneeUserIds,
      ...(tags.length > 0 ? { tags } : {}),
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
        v.literal("custom"),
        v.literal("weeklyDays")
      )
    ),
    recurrenceInterval: v.optional(v.number()),
    recurrenceUnit: recurrenceUnitValidator,
    recurrenceDayOfWeek: v.optional(v.number()),
    recurrenceDaysOfWeek: recurrenceDaysOfWeekValidator,
    visibility: v.optional(visibilityValidator),
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
    tags: v.optional(v.array(v.string())),
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
    if (rest.recurrenceDaysOfWeek !== undefined)
      finalPatch.recurrenceDaysOfWeek = normalizeWeekdays(rest.recurrenceDaysOfWeek);
    if (rest.tags !== undefined) {
      finalPatch.tags = normalizeTags(rest.tags);
    }
    const nextRecurrenceType = rest.recurrenceType ?? task.recurrenceType;
    if (nextRecurrenceType === "weeklyDays") {
      const nextWeekdays =
        rest.recurrenceDaysOfWeek !== undefined
          ? normalizeWeekdays(rest.recurrenceDaysOfWeek)
          : normalizeWeekdays(task.recurrenceDaysOfWeek);
      if (nextWeekdays.length === 0) {
        throw new Error("Pick at least one weekday");
      }
      finalPatch.recurrenceDaysOfWeek = nextWeekdays;
    }

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

