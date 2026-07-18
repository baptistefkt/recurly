import type { OptimisticLocalStore } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type ToggleableItem = {
  _id: Id<"shoppingListItems">;
  text: string;
  completed: boolean;
  sortOrder: number;
  completedAt?: number;
};

function reorderAfterToggle<T extends ToggleableItem>(
  items: T[],
  itemId: Id<"shoppingListItems">
): T[] | null {
  const current = items.find((item) => item._id === itemId);
  if (!current) return null;

  const now = Date.now();
  let updated: T;
  if (current.completed) {
    let maxSort = 0;
    for (const item of items) {
      if (item._id === itemId || item.completed) continue;
      if (item.sortOrder > maxSort) maxSort = item.sortOrder;
    }
    updated = {
      ...current,
      completed: false,
      completedAt: undefined,
      sortOrder: maxSort + 1,
    };
  } else {
    updated = {
      ...current,
      completed: true,
      completedAt: now,
    };
  }

  const next = items.map((item) => (item._id === itemId ? updated : item));
  const active = next
    .filter((item) => !item.completed)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const done = next
    .filter((item) => item.completed)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  return [...active, ...done];
}

/** Instant checkbox / list reorder while toggleItemComplete is in flight. */
export function optimisticToggleItemComplete(
  localStore: OptimisticLocalStore,
  args: { itemId: Id<"shoppingListItems"> }
): void {
  for (const { args: queryArgs, value } of localStore.getAllQueries(
    api.shoppingLists.listItems
  )) {
    if (value === undefined) continue;
    const next = reorderAfterToggle(value, args.itemId);
    if (!next) continue;
    localStore.setQuery(api.shoppingLists.listItems, queryArgs, next);
  }

  for (const { args: queryArgs, value } of localStore.getAllQueries(
    api.shoppingLists.listMinePreviews
  )) {
    if (value === undefined) continue;

    let changed = false;
    const nextPreviews = value.map((row) => {
      const previewItem = row.previewItems.find((item) => item._id === args.itemId);
      if (!previewItem) return row;

      const asListed: ToggleableItem[] = row.previewItems.map((item, index) => ({
        _id: item._id,
        text: item.text,
        completed: item.completed,
        sortOrder: index,
      }));
      const reordered = reorderAfterToggle(asListed, args.itemId);
      if (!reordered) return row;

      changed = true;
      const totalItemCount = previewItem.completed
        ? row.totalItemCount + 1
        : Math.max(0, row.totalItemCount - 1);

      return {
        ...row,
        previewItems: reordered.map((item) => ({
          _id: item._id,
          text: item.text,
          completed: item.completed,
        })),
        totalItemCount,
      };
    });

    if (changed) {
      localStore.setQuery(api.shoppingLists.listMinePreviews, queryArgs, nextPreviews);
    }
  }
}

/** Instant active-item reorder while reorderActiveItems is in flight. */
export function optimisticReorderActiveItems(
  localStore: OptimisticLocalStore,
  args: { listId: Id<"shoppingLists">; orderedItemIds: Id<"shoppingListItems">[] }
): void {
  for (const { args: queryArgs, value } of localStore.getAllQueries(
    api.shoppingLists.listItems
  )) {
    if (value === undefined) continue;
    if (queryArgs.listId !== args.listId) continue;

    const byId = new Map(value.map((item) => [item._id, item]));
    const active: typeof value = [];
    for (let i = 0; i < args.orderedItemIds.length; i++) {
      const id = args.orderedItemIds[i]!;
      const item = byId.get(id);
      if (!item || item.completed) continue;
      active.push({ ...item, sortOrder: i });
    }
    const done = value
      .filter((item) => item.completed)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
    localStore.setQuery(api.shoppingLists.listItems, queryArgs, [...active, ...done]);
  }

  for (const { args: queryArgs, value } of localStore.getAllQueries(
    api.shoppingLists.listMinePreviews
  )) {
    if (value === undefined) continue;

    let changed = false;
    const nextPreviews = value.map((row) => {
      if (row.list._id !== args.listId) return row;

      const orderIndex = new Map(
        args.orderedItemIds.map((id, index) => [id, index] as const)
      );
      const activeInPreview = row.previewItems.filter((item) => !item.completed);
      const done = row.previewItems.filter((item) => item.completed);
      const reorderedActive = [...activeInPreview].sort(
        (a, b) => (orderIndex.get(a._id) ?? 0) - (orderIndex.get(b._id) ?? 0)
      );

      changed = true;
      return {
        ...row,
        previewItems: [...reorderedActive, ...done],
      };
    });

    if (changed) {
      localStore.setQuery(api.shoppingLists.listMinePreviews, queryArgs, nextPreviews);
    }
  }
}
