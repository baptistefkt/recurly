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
      v.literal("custom"),
      v.literal("weeklyDays"),
      v.literal("once")
    ),
    /** Absolute due instant (epoch ms) when recurrenceType is "once". */
    dueAt: v.optional(v.number()),
    /** Optional schedule start instant (epoch ms) for recurring tasks. */
    recurrenceStartAt: v.optional(v.number()),
    /** Optional schedule end instant (epoch ms) for recurring tasks. */
    recurrenceEndAt: v.optional(v.number()),
    recurrenceInterval: v.optional(v.number()),
    recurrenceUnit: v.optional(v.union(v.literal("days"), v.literal("weeks"), v.literal("months"))),
    recurrenceDayOfWeek: v.optional(v.number()),
    recurrenceDaysOfWeek: v.optional(v.array(v.number())),
    isArchived: v.optional(v.boolean()),
    // Legacy field kept for backward compatibility with existing rows.
    color: v.optional(v.string()),
    visibility: v.optional(taskVisibility),
    teamId: v.optional(v.id("teams")),
    assigneeUserIds: v.optional(v.array(v.id("users"))),
    tags: v.optional(v.array(v.string())),
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

  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"])
    .index("by_userId_and_token", ["userId", "token"]),

  taskReminderLog: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    reminderType: v.union(v.literal("due_soon"), v.literal("overdue")),
    dueAt: v.number(),
    sentAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_sentAt", ["sentAt"])
    .index("by_userId_and_taskId_and_reminderType_and_dueAt", [
      "userId",
      "taskId",
      "reminderType",
      "dueAt",
    ]),
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
    /** Which task list is shown: personal-only, merged personal + all teams, or one team. */
    taskListScope: v.optional(
      v.union(v.literal("personal"), v.literal("all"), v.literal("team"))
    ),
    pushRemindersEnabled: v.optional(v.boolean()),
    pushReminderDueSoonMinutes: v.optional(v.number()),
    pushReminderOverdueEnabled: v.optional(v.boolean()),
    pushReminderOverdueDelayMinutes: v.optional(v.number()),
    pushReminderMaxOverdueHours: v.optional(v.number()),
    pushReminderQuietHoursEnabled: v.optional(v.boolean()),
    pushReminderQuietStartHour: v.optional(v.number()),
    pushReminderQuietEndHour: v.optional(v.number()),
    pushReminderTimezoneOffsetMinutes: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  ...applicationTables,
});
