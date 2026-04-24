import { useEffect, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { SUGGESTION_PREFIX_DEBOUNCE_MS } from "./listsPageUtils";

/** Debounces `addDraft` into a prefix used by the suggestions query (must run before that query). */
export function useDebouncedShoppingListPrefix(
  listIdParam: Id<"shoppingLists"> | null,
  addDraft: string
) {
  const [debouncedSuggestionPrefix, setDebouncedSuggestionPrefix] = useState("");

  useEffect(() => {
    setDebouncedSuggestionPrefix("");
  }, [listIdParam]);

  useEffect(() => {
    if (!listIdParam) return;
    const id = window.setTimeout(() => {
      setDebouncedSuggestionPrefix(addDraft);
    }, SUGGESTION_PREFIX_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [addDraft, listIdParam]);

  return { debouncedSuggestionPrefix };
}
