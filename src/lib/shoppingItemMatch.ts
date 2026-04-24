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

export function bestIncompleteFuseMatch(
  rawInput: string,
  items: ShoppingItemForMatch[]
): { item: ShoppingItemForMatch; score: number } | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const pool = items.filter((i) => !i.completed);
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

  const results = fuse.search(trimmed);
  const first = results[0];
  if (!first || first.score === undefined) return null;
  return { item: first.item, score: first.score };
}
