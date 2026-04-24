import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type ListItem = {
  _id: Id<"shoppingListItems">;
  completed: boolean;
};

export function useShoppingListItemEdit(
  listIdParam: Id<"shoppingLists"> | null,
  items: ListItem[] | undefined,
  updateItemText: (args: { itemId: Id<"shoppingListItems">; text: string }) => Promise<unknown>
) {
  const [editingItemId, setEditingItemId] = useState<Id<"shoppingListItems"> | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const editingItemIdRef = useRef<Id<"shoppingListItems"> | null>(null);
  const editTextRef = useRef("");

  useEffect(() => {
    setEditingItemId(null);
  }, [listIdParam]);

  editingItemIdRef.current = editingItemId;
  editTextRef.current = editText;

  useEffect(() => {
    if (!editingItemId) return;
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingItemId]);

  useEffect(() => {
    if (!editingItemId || !items) return;
    const row = items.find((i) => i._id === editingItemId);
    if (row?.completed) setEditingItemId(null);
  }, [items, editingItemId]);

  async function commitEditItem() {
    const itemId = editingItemIdRef.current;
    if (!itemId) return;
    const text = editTextRef.current.trim();
    if (!text) {
      setEditingItemId(null);
      return;
    }
    try {
      await updateItemText({ itemId, text });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
    setEditingItemId(null);
  }

  /** Avoid committing on the spurious blur from opening the editor (button → input) or Strict remounts. */
  const scheduleCommitEditFromBlur = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = editInputRef.current;
        if (!el) return;
        if (document.activeElement === el) return;
        void commitEditItem();
      });
    });
  }, []);

  return {
    editingItemId,
    setEditingItemId,
    editText,
    setEditText,
    editInputRef,
    commitEditItem,
    scheduleCommitEditFromBlur,
  };
}
