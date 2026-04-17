import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

export const savePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingByToken = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existingByToken) {
      if (existingByToken.userId !== userId) {
        await ctx.db.patch(existingByToken._id, { userId });
      }
      return existingByToken._id;
    }

    return await ctx.db.insert("pushTokens", {
      userId,
      token: args.token,
      createdAt: Date.now(),
    });
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId_and_token", (q) =>
        q.eq("userId", userId).eq("token", args.token)
      )
      .unique();
    if (!existing) return null;
    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

export const myPushTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listTokensByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.map((row) => row.token);
  },
});

export const listUserIdsWithPushTokens = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("pushTokens").take(args.limit ?? 1000);
    const ids = new Set(rows.map((row) => row.userId));
    return [...ids];
  },
});

export const deleteTokenByValue = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!existing) return null;
    await ctx.db.delete(existing._id);
    return existing._id;
  },
});
