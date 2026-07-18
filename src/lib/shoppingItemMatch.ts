import Fuse from "fuse.js";
import type { Id } from "../../convex/_generated/dataModel";

/** Matches server `normalizeLabel` in `convex/shoppingLists.ts`. */
export function normalizeShoppingInput(text: string): string {
  return text.trim().toLowerCase();
}

export type ShoppingItemForMatch = {
  _id: Id<"shoppingListItems">;
  text: string;
  canonicalName?: string;
  completed: boolean;
};

export const FUSE_THRESHOLD = 0.3;
export const AUTO_REUSE_MAX_SCORE = 0.25;
export const AMBIGUOUS_MIN_SCORE = 0.25;
export const AMBIGUOUS_MAX_SCORE = 0.4;

function canonicalOf(item: ShoppingItemForMatch): string {
  return item.canonicalName?.trim() || normalizeShoppingInput(item.text);
}

function bestFuseMatchInPool(
  rawInput: string,
  pool: ShoppingItemForMatch[]
): { item: ShoppingItemForMatch; score: number } | null {
  if (pool.length === 0) return null;

  const docs = pool.map((i) => ({
    ...i,
    canonicalName: canonicalOf(i),
  }));

  const fuse = new Fuse(docs, {
    keys: ["canonicalName"],
    includeScore: true,
    threshold: FUSE_THRESHOLD,
    ignoreLocation: true,
  });

  const results = fuse.search(rawInput.trim());
  const first = results[0];
  if (!first || first.score === undefined) return null;
  return { item: first.item, score: first.score };
}

/**
 * Prefer an incomplete match when one exists; otherwise match completed items
 * so re-adding a checked-off item reuses it instead of creating a duplicate.
 */
export function bestFuseMatch(
  rawInput: string,
  items: ShoppingItemForMatch[]
): { item: ShoppingItemForMatch; score: number } | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const incomplete = bestFuseMatchInPool(
    trimmed,
    items.filter((i) => !i.completed)
  );
  if (incomplete) return incomplete;

  return bestFuseMatchInPool(
    trimmed,
    items.filter((i) => i.completed)
  );
}

/** @deprecated Prefer {@link bestFuseMatch}. */
export const bestIncompleteFuseMatch = bestFuseMatch;
