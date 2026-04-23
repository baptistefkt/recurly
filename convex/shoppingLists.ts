import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertCanAccessShoppingList,
  assertTeamMember,
  requireAuthUserId,
} from "./teamAccess";

type DbCtx = QueryCtx | MutationCtx;

function normalizeLabel(text: string): string {
  return text.trim().toLowerCase();
}

async function requireList(ctx: DbCtx, listId: Id<"shoppingLists">) {
  const list = await ctx.db.get(listId);
  if (!list) throw new Error("List not found");
  return list;
}

async function mergedShoppingListsForUser(
  ctx: QueryCtx,
  userId: Id<"users">,
  includeArchived: boolean
): Promise<Doc<"shoppingLists">[]> {
  let personal: Doc<"shoppingLists">[];
  if (includeArchived) {
    personal = (
      await ctx.db
        .query("shoppingLists")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((l) => l.teamId === undefined);
  } else {
    personal = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", userId).eq("isArchived", false)
      )
      .filter((q) => q.eq(q.field("teamId"), undefined))
      .collect();
  }

  const memberships = await ctx.db
    .query("teamMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const teamListsNested = await Promise.all(
    memberships.map(async (m) => {
      if (includeArchived) {
        return await ctx.db
          .query("shoppingLists")
          .withIndex("by_team", (q) => q.eq("teamId", m.teamId))
          .collect();
      }
      return await ctx.db
        .query("shoppingLists")
        .withIndex("by_team_and_archived", (q) =>
          q.eq("teamId", m.teamId).eq("isArchived", false)
        )
        .collect();
    })
  );

  const teamLists = teamListsNested.flat();
  const seen = new Set<string>();
  const merged: Doc<"shoppingLists">[] = [];
  for (const list of [...personal, ...teamLists]) {
    const id = list._id;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(list);
  }
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged;
}

export const listMine = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    return await mergedShoppingListsForUser(ctx, userId, args.includeArchived ?? false);
  },
});

export const listMinePreviews = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    /** Max lines per card preview (capped 6–14). */
    previewLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const merged = await mergedShoppingListsForUser(ctx, userId, args.includeArchived ?? false);
    const previewLimit = Math.min(Math.max(args.previewLimit ?? 12, 6), 14);

    const out: {
      list: Doc<"shoppingLists">;
      previewItems: { _id: Id<"shoppingListItems">; text: string; completed: boolean }[];
      totalItemCount: number;
    }[] = [];

    for (const list of merged) {
      const allItems = await ctx.db
        .query("shoppingListItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      const active = allItems.filter((i) => !i.completed).sort((a, b) => a.sortOrder - b.sortOrder);
      const done = allItems
        .filter((i) => i.completed)
        .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
      const ordered = [...active, ...done];
      out.push({
        list,
        previewItems: ordered.slice(0, previewLimit).map((i) => ({
          _id: i._id,
          text: i.text,
          completed: i.completed,
        })),
        totalItemCount: ordered.length,
      });
    }
    return out;
  },
});

export const get = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) return null;
    try {
      await assertCanAccessShoppingList(ctx, list, userId);
    } catch {
      return null;
    }
    return list;
  },
});

export const listItems = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) return [];
    await assertCanAccessShoppingList(ctx, list, userId);

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const active = items.filter((i) => !i.completed).sort((a, b) => a.sortOrder - b.sortOrder);
    const done = items
      .filter((i) => i.completed)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
    return [...active, ...done];
  },
});

export const listSuggestions = query({
  args: {
    listId: v.id("shoppingLists"),
    prefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) return [];
    await assertCanAccessShoppingList(ctx, list, userId);

    const rows = await ctx.db
      .query("shoppingListSuggestions")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const needle = normalizeLabel(args.prefix ?? "");
    const filtered =
      needle.length === 0
        ? rows
        : rows.filter(
            (r) =>
              r.normalizedLabel.includes(needle) ||
              r.displayLabel.toLowerCase().includes(needle)
          );

    filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    return filtered.slice(0, 50).map((r) => ({
      _id: r._id,
      displayLabel: r.displayLabel,
      normalizedLabel: r.normalizedLabel,
    }));
  },
});

export const createList = mutation({
  args: {
    title: v.string(),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Title required");

    if (args.teamId) {
      await assertTeamMember(ctx, args.teamId, userId);
      return await ctx.db.insert("shoppingLists", {
        userId,
        teamId: args.teamId,
        title,
        createdAt: Date.now(),
        isArchived: false,
      });
    }

    return await ctx.db.insert("shoppingLists", {
      userId,
      title,
      createdAt: Date.now(),
      isArchived: false,
    });
  },
});

export const updateListTitle = mutation({
  args: { listId: v.id("shoppingLists"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await requireList(ctx, args.listId);
    await assertCanAccessShoppingList(ctx, list, userId);
    const title = args.title.trim();
    if (!title) throw new Error("Title required");
    await ctx.db.patch(args.listId, { title });
  },
});

export const setListArchived = mutation({
  args: { listId: v.id("shoppingLists"), isArchived: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await requireList(ctx, args.listId);
    await assertCanAccessShoppingList(ctx, list, userId);
    await ctx.db.patch(args.listId, { isArchived: args.isArchived });
  },
});

export const removeList = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await requireList(ctx, args.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    const suggestions = await ctx.db
      .query("shoppingListSuggestions")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const s of suggestions) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.listId);
  },
});

async function nextItemSortOrder(ctx: MutationCtx, listId: Id<"shoppingLists">): Promise<number> {
  const items = await ctx.db
    .query("shoppingListItems")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .collect();
  let max = 0;
  for (const i of items) {
    if (i.sortOrder > max) max = i.sortOrder;
  }
  return max + 1;
}

async function upsertSuggestion(
  ctx: MutationCtx,
  listId: Id<"shoppingLists">,
  displayLabel: string
) {
  const normalizedLabel = normalizeLabel(displayLabel);
  if (!normalizedLabel) return;

  const existing = await ctx.db
    .query("shoppingListSuggestions")
    .withIndex("by_list_and_normalized", (q) =>
      q.eq("listId", listId).eq("normalizedLabel", normalizedLabel)
    )
    .unique();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      displayLabel: displayLabel.trim(),
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("shoppingListSuggestions", {
      listId,
      normalizedLabel,
      displayLabel: displayLabel.trim(),
      updatedAt: now,
    });
  }
}

export const addItem = mutation({
  args: { listId: v.id("shoppingLists"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await requireList(ctx, args.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const text = args.text.trim();
    if (!text) throw new Error("Item text required");

    const sortOrder = await nextItemSortOrder(ctx, args.listId);
    const id = await ctx.db.insert("shoppingListItems", {
      listId: args.listId,
      text,
      completed: false,
      sortOrder,
    });
    await upsertSuggestion(ctx, args.listId, text);
    return id;
  },
});

export const updateItemText = mutation({
  args: { itemId: v.id("shoppingListItems"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const list = await requireList(ctx, item.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const text = args.text.trim();
    if (!text) throw new Error("Item text required");
    await ctx.db.patch(args.itemId, { text });
    await upsertSuggestion(ctx, item.listId, text);
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("shoppingListItems") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const list = await requireList(ctx, item.listId);
    await assertCanAccessShoppingList(ctx, list, userId);
    await ctx.db.delete(args.itemId);
  },
});

export const toggleItemComplete = mutation({
  args: { itemId: v.id("shoppingListItems") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const list = await requireList(ctx, item.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    if (item.completed) {
      await ctx.db.patch(args.itemId, {
        completed: false,
        completedAt: undefined,
      });
    } else {
      await ctx.db.patch(args.itemId, {
        completed: true,
        completedAt: Date.now(),
      });
    }
  },
});
