import { useEffect, useRef } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { NO_SUGGESTIONS, type SuggestionQueryRow } from "./listsPageUtils";

/** Keeps last successful suggestions while refetching so the combobox does not flicker empty. */
export function useShoppingListSuggestionsWithStale(
  listIdParam: Id<"shoppingLists"> | null,
  suggestions: SuggestionQueryRow[] | undefined
) {
  const suggestionsStaleRef = useRef<SuggestionQueryRow[] | undefined>(undefined);

  useEffect(() => {
    suggestionsStaleRef.current = undefined;
  }, [listIdParam]);

  if (suggestions !== undefined) {
    suggestionsStaleRef.current = suggestions;
  }
  return suggestions ?? suggestionsStaleRef.current ?? NO_SUGGESTIONS;
}
