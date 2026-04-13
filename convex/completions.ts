import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertCanAccessTask } from "./teamAccess";

function displayName(email: string | undefined, name: string | undefined) {
  if (name?.trim()) return name.trim();
  if (email) return email;
  return "Someone";
}

export const listForTask = query({
  args: { taskId: v.id("tasks"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const task = await ctx.db.get(args.taskId);
    if (!task) return [];
    try {
      await assertCanAccessTask(ctx, task, userId);
    } catch {
      return [];
    }

    const completions = await ctx.db
      .query("completions")
      .withIndex("by_task_and_time", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .take(args.limit ?? 50);

    const out = [];
    for (const c of completions) {
      const u = await ctx.db.get(c.userId);
      out.push({
        ...c,
        completerDisplayName: displayName(u?.email, u?.name),
      });
    }
    return out;
  },
});

export const markComplete = mutation({
  args: {
    taskId: v.id("tasks"),
    note: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);
    const id = await ctx.db.insert("completions", {
      taskId: args.taskId,
      userId,
      completedAt: args.completedAt ?? Date.now(),
      note: args.note,
    });
    if (task.recurrenceType === "once") {
      await ctx.db.patch(args.taskId, { isArchived: true });
    }
    return id;
  },
});

export const deleteCompletion = mutation({
  args: { completionId: v.id("completions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const completion = await ctx.db.get(args.completionId);
    if (!completion) throw new Error("Not found");
    const task = await ctx.db.get(completion.taskId);
    if (!task) throw new Error("Not found");
    await assertCanAccessTask(ctx, task, userId);
    const isCompleter = completion.userId === userId;
    const isTaskCreator = task.userId === userId;
    if (!isCompleter && !isTaskCreator) throw new Error("Not allowed");
    await ctx.db.delete(args.completionId);
    if (task.recurrenceType === "once") {
      const remaining = await ctx.db
        .query("completions")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .first();
      if (remaining === null) {
        await ctx.db.patch(task._id, { isArchived: false });
      }
    }
  },
});
