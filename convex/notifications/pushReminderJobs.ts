"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

function isInQuietHours(
  nowMs: number,
  timezoneOffsetMinutes: number,
  quietStartHour: number,
  quietEndHour: number
) {
  const shifted = nowMs - timezoneOffsetMinutes * 60 * 1000;
  const local = new Date(shifted);
  const minuteOfDay = local.getUTCHours() * 60 + local.getUTCMinutes();
  const start = quietStartHour * 60;
  const end = quietEndHour * 60;
  if (start === end) return true;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

function reminderContent(reminder: {
  reminderType: "due_soon" | "overdue";
  title: string;
}) {
  if (reminder.reminderType === "due_soon") {
    return {
      title: "Task due soon",
      body: `"${reminder.title}" is due within the next 30 minutes.`,
    };
  }
  return {
    title: "Task overdue",
    body: `"${reminder.title}" is overdue. Mark it complete when done.`,
  };
}

export const dispatchRecurringTaskReminders = internalAction({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();

    const usersWithTokens: Id<"users">[] = await ctx.runQuery(
      internal.notifications.pushTokens.listUserIdsWithPushTokens,
      { limit: 1000 }
    );

    let checkedUsers = 0;
    let sent = 0;

    for (const userId of usersWithTokens) {
      checkedUsers += 1;
      const prefs = await ctx.runQuery(
        internal.notifications.reminderPreferences.getReminderPreferencesForUser,
        { userId }
      );
      if (!prefs.enabled) continue;
      if (
        prefs.quietHoursEnabled &&
        isInQuietHours(
          now,
          prefs.timezoneOffsetMinutes,
          prefs.quietStartHour,
          prefs.quietEndHour
        )
      ) {
        continue;
      }

      const reminders = await ctx.runQuery(
        internal.notifications.taskReminders.findPendingRemindersForUser,
        {
          userId,
          now,
          dueSoonWindowMs: prefs.dueSoonMinutes * 60 * 1000,
          overdueEnabled: prefs.overdueEnabled,
          overdueDelayMs: prefs.overdueDelayMinutes * 60 * 1000,
          maxOverdueMs: prefs.maxOverdueHours * 60 * 60 * 1000,
        }
      );

      for (const reminder of reminders) {
        const shouldSend = await ctx.runMutation(
          internal.notifications.taskReminders.recordReminderIfNotSent,
          {
            userId: reminder.userId,
            taskId: reminder.taskId,
            reminderType: reminder.reminderType,
            dueAt: reminder.dueAt,
          }
        );
        if (!shouldSend) continue;

        const content = reminderContent(reminder);
        await ctx.runAction(internal.notifications.pushNotifications.sendPushNotification, {
          userId: reminder.userId,
          title: content.title,
          body: content.body,
          data: {
            taskId: reminder.taskId,
            reminderType: reminder.reminderType,
            dueAt: String(reminder.dueAt),
          },
        });
        sent += 1;
      }
    }

    return { checkedUsers, sent };
  },
});
