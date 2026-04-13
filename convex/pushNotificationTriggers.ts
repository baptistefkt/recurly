import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";

export const triggerMyPushNotification = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
      userId,
      title: args.title,
      body: args.body,
      data: args.data,
    });
    return { scheduled: true };
  },
});
