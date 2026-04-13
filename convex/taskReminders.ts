import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { computeNextDue } from "./recurrence";

const MAX_OWNED_TASKS = 500;
const MAX_MEMBER_TEAMS = 100;
const MAX_TEAM_TASKS = 500;

export const findPendingRemindersForUser = internalQuery({
  args: {
    userId: v.id("users"),
    now: v.number(),
    dueSoonWindowMs: v.number(),
    overdueEnabled: v.boolean(),
    overdueDelayMs: v.number(),
    maxOverdueMs: v.number(),
  },
  handler: async (ctx, args) => {
    const ownedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", args.userId).eq("isArchived", false)
      )
      .take(MAX_OWNED_TASKS);

    const memberRows = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(MAX_MEMBER_TEAMS);
    const teamTaskLists = await Promise.all(
      memberRows.map(async (row) => {
        const teamTasks = await ctx.db
          .query("tasks")
          .withIndex("by_team_and_archived", (q) =>
            q.eq("teamId", row.teamId).eq("isArchived", false)
          )
          .take(MAX_TEAM_TASKS);
        const out = [];
        for (const task of teamTasks) {
          if ((task.visibility ?? "personal") !== "team") continue;
          const assignees = task.assigneeUserIds ?? [];
          if (assignees.length === 0 && task.userId !== args.userId) continue;
          if (assignees.length > 0 && !assignees.includes(args.userId)) continue;
          out.push(task);
        }
        return out;
      })
    );

    const byId = new Map<string, (typeof ownedTasks)[number]>();
    for (const task of ownedTasks) {
      if (task.isArchived) continue;
      if ((task.visibility ?? "personal") === "team") {
        const assignees = task.assigneeUserIds ?? [];
        if (assignees.length > 0 && !assignees.includes(args.userId)) continue;
      }
      byId.set(task._id, task);
    }
    for (const list of teamTaskLists) {
      for (const task of list) {
        byId.set(task._id, task);
      }
    }
    const activeTasks = [...byId.values()];

    const reminders: Array<{
      userId: Id<"users">;
      taskId: Id<"tasks">;
      title: string;
      dueAt: number;
      reminderType: "due_soon" | "overdue";
    }> = [];

    for (const task of activeTasks) {
      const lastCompletion = await ctx.db
        .query("completions")
        .withIndex("by_task_and_time", (q) => q.eq("taskId", task._id))
        .order("desc")
        .first();
      const dueAt = computeNextDue(
        task,
        lastCompletion?.completedAt ?? null,
        task._creationTime
      );
      if (dueAt === null) continue;

      const millisUntilDue = dueAt - args.now;
      const millisOverdue = args.now - dueAt;
      if (millisUntilDue >= 0 && millisUntilDue <= args.dueSoonWindowMs) {
        reminders.push({
          userId: args.userId,
          taskId: task._id,
          title: task.title,
          dueAt,
          reminderType: "due_soon",
        });
      } else if (
        args.overdueEnabled &&
        millisOverdue >= args.overdueDelayMs &&
        millisOverdue <= args.maxOverdueMs
      ) {
        reminders.push({
          userId: args.userId,
          taskId: task._id,
          title: task.title,
          dueAt,
          reminderType: "overdue",
        });
      }
    }
    return reminders;
  },
});

export const recordReminderIfNotSent = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    reminderType: v.union(v.literal("due_soon"), v.literal("overdue")),
    dueAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("taskReminderLog")
      .withIndex("by_userId_and_taskId_and_reminderType_and_dueAt", (q) =>
        q
          .eq("userId", args.userId)
          .eq("taskId", args.taskId)
          .eq("reminderType", args.reminderType)
          .eq("dueAt", args.dueAt)
      )
      .unique();
    if (existing) {
      return false;
    }
    await ctx.db.insert("taskReminderLog", {
      userId: args.userId,
      taskId: args.taskId,
      reminderType: args.reminderType,
      dueAt: args.dueAt,
      sentAt: Date.now(),
    });
    return true;
  },
});
