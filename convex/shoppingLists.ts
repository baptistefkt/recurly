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

function itemCanonical(item: Doc<"shoppingListItems">): string {
  return item.canonicalName ?? normalizeLabel(item.text);
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

async function incrementItemUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  listId: Id<"shoppingLists">,
  itemId: Id<"shoppingListItems">
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("shoppingListItemUserUsage")
    .withIndex("by_user_and_item", (q) => q.eq("userId", userId).eq("itemId", itemId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      lastUsedAt: now,
    });
  } else {
    await ctx.db.insert("shoppingListItemUserUsage", {
      userId,
      listId,
      itemId,
      count: 1,
      lastUsedAt: now,
    });
  }
}

async function tryInsertAlias(
  ctx: MutationCtx,
  listId: Id<"shoppingLists">,
  itemId: Id<"shoppingListItems">,
  typedText: string
) {
  const item = await ctx.db.get(itemId);
  if (!item) return;
  const normalizedAlias = normalizeLabel(typedText);
  if (normalizedAlias.length < 2) return;
  const canonical = itemCanonical(item);
  if (normalizedAlias === canonical) return;

  const dup = await ctx.db
    .query("shoppingListItemAliases")
    .withIndex("by_list_and_normalized_alias", (q) =>
      q.eq("listId", listId).eq("normalizedAlias", normalizedAlias)
    )
    .unique();
  if (dup) {
    if (dup.itemId === itemId) return;
    return;
  }

  await ctx.db.insert("shoppingListItemAliases", {
    listId,
    itemId,
    normalizedAlias,
  });
}

async function deleteUsagesForItem(ctx: MutationCtx, itemId: Id<"shoppingListItems">) {
  const rows = await ctx.db
    .query("shoppingListItemUserUsage")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .collect();
  for (const r of rows) {
    await ctx.db.delete(r._id);
  }
}

async function deleteAliasesForItem(ctx: MutationCtx, itemId: Id<"shoppingListItems">) {
  const rows = await ctx.db
    .query("shoppingListItemAliases")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .collect();
  for (const r of rows) {
    await ctx.db.delete(r._id);
  }
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

/** Alias map for the list (normalized string → item id). */
export const listShoppingAliases = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) return [];
    await assertCanAccessShoppingList(ctx, list, userId);

    return await ctx.db
      .query("shoppingListItemAliases")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
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

    const needle = normalizeLabel(args.prefix ?? "");

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const itemById = new Map(items.map((i) => [i._id, i]));

    const usageRows = await ctx.db
      .query("shoppingListItemUserUsage")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", args.listId).eq("userId", userId)
      )
      .collect();

    usageRows.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastUsedAt - a.lastUsedAt;
    });

    type Row = {
      rowKey: string;
      displayLabel: string;
      normalizedLabel: string;
      reuseItemId?: Id<"shoppingListItems">;
    };

    const rows: Row[] = [];
    const seenNormalized = new Set<string>();

    for (const u of usageRows) {
      const item = itemById.get(u.itemId);
      if (!item) continue;
      const normalizedLabel = itemCanonical(item);
      if (seenNormalized.has(normalizedLabel)) continue;
      seenNormalized.add(normalizedLabel);

      if (
        needle.length > 0 &&
        !normalizedLabel.includes(needle) &&
        !item.text.toLowerCase().includes(needle)
      ) {
        continue;
      }

      rows.push({
        rowKey: `u:${item._id}`,
        displayLabel: item.text,
        normalizedLabel,
        reuseItemId: item.completed ? undefined : item._id,
      });
    }

    const suggestionDocs = await ctx.db
      .query("shoppingListSuggestions")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    suggestionDocs.sort((a, b) => b.updatedAt - a.updatedAt);

    for (const s of suggestionDocs) {
      if (seenNormalized.has(s.normalizedLabel)) continue;
      if (
        needle.length > 0 &&
        !s.normalizedLabel.includes(needle) &&
        !s.displayLabel.toLowerCase().includes(needle)
      ) {
        continue;
      }
      seenNormalized.add(s.normalizedLabel);

      const activeSame = items.find(
        (i) => !i.completed && itemCanonical(i) === s.normalizedLabel
      );
      rows.push({
        rowKey: `s:${s._id}`,
        displayLabel: s.displayLabel,
        normalizedLabel: s.normalizedLabel,
        reuseItemId: activeSame?._id,
      });
    }

    return rows.slice(0, 50);
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

    const usages = await ctx.db
      .query("shoppingListItemUserUsage")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const u of usages) {
      await ctx.db.delete(u._id);
    }

    const aliases = await ctx.db
      .query("shoppingListItemAliases")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const a of aliases) {
      await ctx.db.delete(a._id);
    }

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
  if (normalizedLabel.length < 2) return;

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

export const reuseShoppingItem = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
    typedText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.completed) throw new Error("Item is completed");
    const list = await requireList(ctx, item.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const typed = args.typedText.trim();
    if (!typed) throw new Error("Text required");

    await incrementItemUsage(ctx, userId, item.listId, item._id);
    await tryInsertAlias(ctx, item.listId, item._id, typed);
    await upsertSuggestion(ctx, item.listId, typed);
    return null;
  },
});

export const addItem = mutation({
  args: { listId: v.id("shoppingLists"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const list = await requireList(ctx, args.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const text = args.text.trim();
    if (!text) throw new Error("Item text required");

    const canonicalName = normalizeLabel(text);

    const sortOrder = await nextItemSortOrder(ctx, args.listId);
    const id = await ctx.db.insert("shoppingListItems", {
      listId: args.listId,
      text,
      canonicalName,
      completed: false,
      sortOrder,
    });
    await incrementItemUsage(ctx, userId, args.listId, id);
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
    if (item.completed) throw new Error("Completed items cannot be edited");
    const list = await requireList(ctx, item.listId);
    await assertCanAccessShoppingList(ctx, list, userId);

    const text = args.text.trim();
    if (!text) throw new Error("Item text required");
    const canonicalName = normalizeLabel(text);
    await ctx.db.patch(args.itemId, { text, canonicalName });
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
    await deleteAliasesForItem(ctx, args.itemId);
    await deleteUsagesForItem(ctx, args.itemId);
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
