import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";

const DEFAULTS = {
  enabled: true,
  overdueEnabled: true,
  quietHoursEnabled: false,
  quietStartHour: 22,
  quietEndHour: 7,
  timezoneOffsetMinutes: 0,
};

export function normalizeReminderPreferences(
  user:
    | {
        pushRemindersEnabled?: boolean;
        pushReminderOverdueEnabled?: boolean;
        pushReminderQuietHoursEnabled?: boolean;
        pushReminderQuietStartHour?: number;
        pushReminderQuietEndHour?: number;
        pushReminderTimezoneOffsetMinutes?: number;
      }
    | null
) {
  return {
    enabled: user?.pushRemindersEnabled ?? DEFAULTS.enabled,
    overdueEnabled:
      user?.pushReminderOverdueEnabled ?? DEFAULTS.overdueEnabled,
    quietHoursEnabled:
      user?.pushReminderQuietHoursEnabled ?? DEFAULTS.quietHoursEnabled,
    quietStartHour:
      user?.pushReminderQuietStartHour ?? DEFAULTS.quietStartHour,
    quietEndHour: user?.pushReminderQuietEndHour ?? DEFAULTS.quietEndHour,
    timezoneOffsetMinutes:
      user?.pushReminderTimezoneOffsetMinutes ?? DEFAULTS.timezoneOffsetMinutes,
  };
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
}

export const getMyReminderPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return normalizeReminderPreferences(user);
  },
});

export const updateMyReminderPreferences = mutation({
  args: {
    enabled: v.boolean(),
    overdueEnabled: v.boolean(),
    quietHoursEnabled: v.boolean(),
    quietStartHour: v.number(),
    quietEndHour: v.number(),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    assertRange("Quiet start hour", args.quietStartHour, 0, 23);
    assertRange("Quiet end hour", args.quietEndHour, 0, 23);
    assertRange("Timezone offset", args.timezoneOffsetMinutes, -840, 840);

    await ctx.db.patch(userId, {
      pushRemindersEnabled: args.enabled,
      pushReminderOverdueEnabled: args.overdueEnabled,
      pushReminderQuietHoursEnabled: args.quietHoursEnabled,
      pushReminderQuietStartHour: args.quietStartHour,
      pushReminderQuietEndHour: args.quietEndHour,
      pushReminderTimezoneOffsetMinutes: args.timezoneOffsetMinutes,
    });

    return { ok: true };
  },
});

export const getReminderPreferencesForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return normalizeReminderPreferences(user);
  },
});
