import { v } from "convex/values";
import { DISPLAY_NAME_MAX_LEN } from "./displayNameLimits";
import { mutation } from "./_generated/server";
import { requireAuthUserId } from "./teamAccess";

export const updateMyDisplayName = mutation({
  args: { displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const raw = args.displayName;
    if (raw === undefined) {
      await ctx.db.patch(userId, { name: undefined });
      return;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      await ctx.db.patch(userId, { name: undefined });
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LEN) {
      throw new Error(`Display name must be at most ${DISPLAY_NAME_MAX_LEN} characters`);
    }
    await ctx.db.patch(userId, { name: trimmed });
  },
});
