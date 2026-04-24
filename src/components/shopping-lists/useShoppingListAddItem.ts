import { useCallback, useEffect, useMemo, useState } from "react";
import type { ShoppingAutocompleteRow } from "@/components/shopping/ShoppingItemCombobox";
import {
  AMBIGUOUS_MAX_SCORE,
  AMBIGUOUS_MIN_SCORE,
  AUTO_REUSE_MAX_SCORE,
  bestIncompleteFuseMatch,
  normalizeShoppingInput,
} from "@/lib/shoppingItemMatch";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type ItemRow = {
  _id: Id<"shoppingListItems">;
  text: string;
  canonicalName?: string;
  completed: boolean;
};

type AliasRow = { normalizedAlias: string; itemId: Id<"shoppingListItems"> };

export function useShoppingListAddItem({
  listIdParam,
  items,
  aliases,
  addItem,
  reuseShoppingItem,
}: {
  listIdParam: Id<"shoppingLists"> | null;
  items: ItemRow[] | undefined;
  aliases: AliasRow[] | undefined;
  addItem: (args: { listId: Id<"shoppingLists">; text: string }) => Promise<unknown>;
  reuseShoppingItem: (args: {
    itemId: Id<"shoppingListItems">;
    typedText: string;
  }) => Promise<unknown>;
}) {
  const [addDraft, setAddDraft] = useState("");
  const [ambiguous, setAmbiguous] = useState<{
    itemId: Id<"shoppingListItems">;
    label: string;
    typed: string;
  } | null>(null);

  useEffect(() => {
    setAddDraft("");
    setAmbiguous(null);
  }, [listIdParam]);

  const aliasToItemId = useMemo(() => {
    const m = new Map<string, Id<"shoppingListItems">>();
    for (const row of aliases ?? []) {
      m.set(row.normalizedAlias, row.itemId);
    }
    return m;
  }, [aliases]);

  const setAddDraftClearAmbiguous = useCallback((v: string) => {
    setAmbiguous(null);
    setAddDraft(v);
  }, []);

  const focusAddInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("shopping-list-add-item")?.focus();
    });
  }, []);

  const handleAddItem = useCallback(
    async (text: string) => {
      if (!listIdParam) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      setAmbiguous(null);

      if (items === undefined || aliases === undefined) {
        toast.error("Still loading…");
        return;
      }

      const normalized = normalizeShoppingInput(trimmed);
      const aliasItemId = aliasToItemId.get(normalized);
      if (aliasItemId) {
        const target = items.find((i) => i._id === aliasItemId);
        if (target && !target.completed) {
          try {
            await reuseShoppingItem({ itemId: aliasItemId, typedText: trimmed });
            setAddDraft("");
            focusAddInput();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not add item");
          }
          return;
        }
      }

      const pool = items.map((i) => ({
        _id: i._id,
        text: i.text,
        canonicalName: i.canonicalName ?? "",
        completed: i.completed,
      }));
      const best = bestIncompleteFuseMatch(trimmed, pool);
      if (best) {
        if (best.score < AUTO_REUSE_MAX_SCORE) {
          try {
            await reuseShoppingItem({ itemId: best.item._id, typedText: trimmed });
            setAddDraft("");
            focusAddInput();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not add item");
          }
          return;
        }
        if (best.score >= AMBIGUOUS_MIN_SCORE && best.score <= AMBIGUOUS_MAX_SCORE) {
          setAmbiguous({
            itemId: best.item._id,
            label: best.item.text,
            typed: trimmed,
          });
          return;
        }
      }

      try {
        await addItem({ listId: listIdParam, text: trimmed });
        setAddDraft("");
        focusAddInput();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add item");
      }
    },
    [listIdParam, items, aliases, aliasToItemId, addItem, reuseShoppingItem, focusAddInput]
  );

  const addItemFromSuggestion = useCallback(
    async (row: ShoppingAutocompleteRow) => {
      if (!listIdParam) return;
      setAmbiguous(null);
      try {
        if (row.reuseItemId) {
          await reuseShoppingItem({
            itemId: row.reuseItemId,
            typedText: row.displayLabel,
          });
        } else {
          await addItem({ listId: listIdParam, text: row.displayLabel });
        }
        setAddDraft("");
        focusAddInput();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add item");
      }
    },
    [listIdParam, addItem, reuseShoppingItem, focusAddInput]
  );

  return {
    addDraft,
    setAddDraft,
    ambiguous,
    setAmbiguous,
    setAddDraftClearAmbiguous,
    handleAddItem,
    addItemFromSuggestion,
  };
}
