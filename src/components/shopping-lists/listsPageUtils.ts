import type { Id } from "../../../convex/_generated/dataModel";

export function parseListIdFromSearch(search: string): Id<"shoppingLists"> | null {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const id = new URLSearchParams(q).get("list");
  if (!id) return null;
  return id as Id<"shoppingLists">;
}

export type PreviewRow = {
  list: {
    _id: Id<"shoppingLists">;
    title: string;
    teamId?: Id<"teams">;
    isArchived?: boolean;
  };
  previewItems: { _id: Id<"shoppingListItems">; text: string; completed: boolean }[];
  totalItemCount: number;
};

export function previewLineClass(index: number): string {
  if (index < 5) return "";
  if (index < 8) return "hidden sm:flex";
  if (index < 10) return "hidden lg:flex";
  return "hidden xl:flex";
}

export const SUGGESTION_PREFIX_DEBOUNCE_MS = 220;

export type SuggestionQueryRow = {
  rowKey: string;
  displayLabel: string;
  normalizedLabel: string;
  reuseItemId?: Id<"shoppingListItems">;
};

export const NO_SUGGESTIONS: SuggestionQueryRow[] = [];
