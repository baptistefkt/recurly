import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  tasks: defineTable({
    userId: v.id("users"),
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
    recurrenceUnit: v.optional(v.union(v.literal("days"), v.literal("weeks"), v.literal("months"))),
    recurrenceDayOfWeek: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    color: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_archived", ["userId", "isArchived"]),

  completions: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    completedAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_task_and_time", ["taskId", "completedAt"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
