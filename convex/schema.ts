import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const taskVisibility = v.union(v.literal("personal"), v.literal("team"));

const applicationTables = {
  teams: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_createdBy", ["createdBy"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  teamInvites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    token: v.string(),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_team", ["teamId"])
    .index("by_team_and_status", ["teamId", "status"]),

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
    visibility: v.optional(taskVisibility),
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_archived", ["userId", "isArchived"])
    .index("by_team", ["teamId"])
    .index("by_team_and_archived", ["teamId", "isArchived"]),

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
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    lastSelectedTeamId: v.optional(v.id("teams")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  ...applicationTables,
});
