import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AnyCtx = QueryCtx | MutationCtx;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requireAuthUserId(ctx: AnyCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getMembership(
  ctx: AnyCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
): Promise<Doc<"teamMembers"> | null> {
  return await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userId", userId)
    )
    .unique();
}

export async function assertTeamMember(
  ctx: AnyCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
): Promise<Doc<"teamMembers">> {
  const m = await getMembership(ctx, teamId, userId);
  if (!m) throw new Error("Not a team member");
  return m;
}

export async function assertTeamAdmin(
  ctx: AnyCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
): Promise<Doc<"teamMembers">> {
  const m = await assertTeamMember(ctx, teamId, userId);
  if (m.role !== "admin") throw new Error("Team admin only");
  return m;
}

export function effectiveVisibility(task: Doc<"tasks">): "personal" | "team" {
  return task.visibility ?? "personal";
}

export async function assertCanAccessTask(
  ctx: AnyCtx,
  task: Doc<"tasks">,
  userId: Id<"users">
): Promise<void> {
  const vis = effectiveVisibility(task);
  if (vis === "personal") {
    if (task.userId !== userId) throw new Error("Not found");
    return;
  }
  if (!task.teamId) throw new Error("Invalid team task");
  await assertTeamMember(ctx, task.teamId, userId);
}

export async function listTeamMemberUserIds(
  ctx: AnyCtx,
  teamId: Id<"teams">
): Promise<Id<"users">[]> {
  const rows = await ctx.db
    .query("teamMembers")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();
  return rows.map((r) => r.userId);
}

export async function validateAssignees(
  ctx: AnyCtx,
  teamId: Id<"teams">,
  assigneeUserIds: Id<"users">[] | undefined
): Promise<void> {
  if (!assigneeUserIds?.length) return;
  const allowed = new Set(await listTeamMemberUserIds(ctx, teamId));
  for (const id of assigneeUserIds) {
    if (!allowed.has(id)) throw new Error("Assignees must be team members");
  }
}
