import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForTask = query({
  args: { taskId: v.id("tasks"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) return [];

    const completions = await ctx.db
      .query("completions")
      .withIndex("by_task_and_time", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .take(args.limit ?? 50);

    return completions;
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
    if (!task || task.userId !== userId) throw new Error("Not found");
    return await ctx.db.insert("completions", {
      taskId: args.taskId,
      userId,
      completedAt: args.completedAt ?? Date.now(),
      note: args.note,
    });
  },
});

export const deleteCompletion = mutation({
  args: { completionId: v.id("completions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const completion = await ctx.db.get(args.completionId);
    if (!completion || completion.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.completionId);
  },
});
