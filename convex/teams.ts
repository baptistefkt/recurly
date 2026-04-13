import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertTeamAdmin,
  assertTeamMember,
  getMembership,
  requireAuthUserId,
} from "./teamAccess";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Team name required");
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      name,
      createdBy: userId,
      createdAt: now,
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId,
      role: "admin",
      joinedAt: now,
    });
    await ctx.db.patch(userId, {
      lastSelectedTeamId: teamId,
      taskListScope: "team",
    });
    return teamId;
  },
});

export const myMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const row of rows) {
      const team = await ctx.db.get(row.teamId);
      if (!team) continue;
      out.push({
        teamId: row.teamId,
        teamName: team.name,
        role: row.role,
        joinedAt: row.joinedAt,
      });
    }
    return out;
  },
});

export const members = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    await assertTeamMember(ctx, args.teamId, userId);
    const rows = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    const out = [];
    for (const row of rows) {
      const u = await ctx.db.get(row.userId);
      out.push({
        userId: row.userId,
        role: row.role,
        joinedAt: row.joinedAt,
        email: u?.email ?? null,
        name: u?.name ?? null,
      });
    }
    return out;
  },
});

export const setLastSelectedTeam = mutation({
  args: { teamId: v.union(v.id("teams"), v.null()) },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    if (args.teamId === null) {
      await ctx.db.patch(userId, {
        lastSelectedTeamId: undefined,
        taskListScope: "personal",
      });
      return;
    }
    await assertTeamMember(ctx, args.teamId, userId);
    await ctx.db.patch(userId, {
      lastSelectedTeamId: args.teamId,
      taskListScope: "team",
    });
  },
});

/** Persists which task list to show: personal, merged (all), or a single team. */
export const setTaskListView = mutation({
  args: {
    view: v.union(
      v.literal("personal"),
      v.literal("all"),
      v.object({ teamId: v.id("teams") })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    if (args.view === "personal") {
      await ctx.db.patch(userId, {
        taskListScope: "personal",
        lastSelectedTeamId: undefined,
      });
      return;
    }
    if (args.view === "all") {
      await ctx.db.patch(userId, { taskListScope: "all" });
      return;
    }
    await assertTeamMember(ctx, args.view.teamId, userId);
    await ctx.db.patch(userId, {
      taskListScope: "team",
      lastSelectedTeamId: args.view.teamId,
    });
  },
});

export const removeMember = mutation({
  args: { teamId: v.id("teams"), memberUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await assertTeamAdmin(ctx, args.teamId, userId);

    const target = await getMembership(ctx, args.teamId, args.memberUserId);
    if (!target) throw new Error("User is not in this team");

    if (args.memberUserId === userId && target.role === "admin") {
      const admins = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
        .collect();
      const adminCount = admins.filter((m) => m.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error(
          "You are the only admin. Delete the team or promote another admin first."
        );
      }
    }

    await ctx.db.delete(target._id);

    const removedUser = await ctx.db.get(args.memberUserId);
    if (removedUser?.lastSelectedTeamId === args.teamId) {
      await ctx.db.patch(args.memberUserId, { lastSelectedTeamId: undefined });
    }
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await assertTeamAdmin(ctx, args.teamId, userId);

    const taskRows = await ctx.db
      .query("tasks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const task of taskRows) {
      const comps = await ctx.db
        .query("completions")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const c of comps) await ctx.db.delete(c._id);
      await ctx.db.delete(task._id);
    }

    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const inv of invites) await ctx.db.delete(inv._id);

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const m of members) {
      const u = await ctx.db.get(m.userId);
      if (u?.lastSelectedTeamId === args.teamId) {
        await ctx.db.patch(m.userId, { lastSelectedTeamId: undefined });
      }
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.teamId);
  },
});
