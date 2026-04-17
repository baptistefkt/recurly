import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  assertTeamAdmin,
  normalizeEmail,
  requireAuthUserId,
} from "./teamAccess";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createInvite = mutation({
  args: { teamId: v.id("teams"), email: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await assertTeamAdmin(ctx, args.teamId, userId);
    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Invalid email");

    const existingMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    const userWithEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (userWithEmail) {
      const already = existingMember.some((m) => m.userId === userWithEmail._id);
      if (already) throw new Error("That user is already in the team");
    }

    const now = Date.now();
    const pending = await ctx.db
      .query("teamInvites")
      .withIndex("by_team_and_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "pending")
      )
      .collect();
    if (pending.some((i) => i.email === email)) {
      throw new Error("An invite is already pending for this email");
    }

    const inviteId = await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email,
      token: randomToken(),
      invitedBy: userId,
      createdAt: now,
      expiresAt: now + INVITE_TTL_MS,
      status: "pending",
    });

    if (userWithEmail) {
      const team = await ctx.db.get(args.teamId);
      const inviter = await ctx.db.get(userId);
      const inviterName = inviter?.name?.trim() || inviter?.email || "Someone";
      const teamName = team?.name ?? "a team";
      await ctx.scheduler.runAfter(0, internal.notifications.pushNotifications.sendPushNotification, {
        userId: userWithEmail._id,
        title: "Team invite",
        body: `${inviterName} invited you to join ${teamName}.`,
        data: {
          eventType: "team_invite",
          teamId: args.teamId,
          inviteId,
        },
      });
    }

    return inviteId;
  },
});

export const listPendingForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    try {
      await assertTeamAdmin(ctx, args.teamId, userId);
    } catch {
      return [];
    }
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team_and_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "pending")
      )
      .collect();
    return invites.map((i) => ({
      _id: i._id,
      email: i.email,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  },
});

export const listPendingForMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db.get(userId);
    if (!me?.email) return [];
    const email = normalizeEmail(me.email);
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const now = Date.now();
    const out = [];
    for (const inv of invites) {
      if (inv.status !== "pending" || inv.expiresAt < now) continue;
      const team = await ctx.db.get(inv.teamId);
      if (!team) continue;
      out.push({
        _id: inv._id,
        teamId: inv.teamId,
        teamName: team.name,
        expiresAt: inv.expiresAt,
      });
    }
    return out;
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("teamInvites") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const inv = await ctx.db.get(args.inviteId);
    if (!inv || inv.status !== "pending") throw new Error("Invite not found");
    await assertTeamAdmin(ctx, inv.teamId, userId);
    await ctx.db.patch(args.inviteId, { status: "revoked" });
  },
});

export const acceptInvite = mutation({
  args: { inviteId: v.id("teamInvites") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const me = await ctx.db.get(userId);
    if (!me?.email) throw new Error("Your account has no email");
    const email = normalizeEmail(me.email);

    const inv = await ctx.db.get(args.inviteId);
    if (!inv || inv.status !== "pending") throw new Error("Invite not found");
    if (inv.email !== email) throw new Error("This invite is for a different email");
    if (inv.expiresAt < Date.now()) throw new Error("Invite expired");

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", inv.teamId).eq("userId", userId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(args.inviteId, { status: "accepted" });
      if (inv.invitedBy !== userId) {
        const team = await ctx.db.get(inv.teamId);
        const accepterName = me.name?.trim() || me.email || "Someone";
        await ctx.scheduler.runAfter(0, internal.notifications.pushNotifications.sendPushNotification, {
          userId: inv.invitedBy,
          title: "Invite accepted",
          body: `${accepterName} accepted your invite to ${team?.name ?? "your team"}.`,
          data: {
            eventType: "team_invite_accepted",
            teamId: inv.teamId,
            inviteId: args.inviteId,
            acceptedByUserId: userId,
          },
        });
      }
      return inv.teamId;
    }

    await ctx.db.insert("teamMembers", {
      teamId: inv.teamId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
    await ctx.db.patch(args.inviteId, { status: "accepted" });
    await ctx.db.patch(userId, { lastSelectedTeamId: inv.teamId });
    if (inv.invitedBy !== userId) {
      const team = await ctx.db.get(inv.teamId);
      const accepterName = me.name?.trim() || me.email || "Someone";
      await ctx.scheduler.runAfter(0, internal.notifications.pushNotifications.sendPushNotification, {
        userId: inv.invitedBy,
        title: "Invite accepted",
        body: `${accepterName} accepted your invite to ${team?.name ?? "your team"}.`,
        data: {
          eventType: "team_invite_accepted",
          teamId: inv.teamId,
          inviteId: args.inviteId,
          acceptedByUserId: userId,
        },
      });
    }
    return inv.teamId;
  },
});
