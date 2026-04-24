import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

export function useShoppingListTitleEdit(
  listIdParam: Id<"shoppingLists"> | null,
  listTitle: string,
  updateListTitle: (args: { listId: Id<"shoppingLists">; title: string }) => Promise<unknown>
) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(listTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingTitle(false);
  }, [listIdParam]);

  useEffect(() => {
    if (editingTitle) return;
    setTitleDraft(listTitle);
  }, [listTitle, listIdParam, editingTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle]);

  async function handleSaveTitle() {
    if (!listIdParam) return;
    const t = titleDraft.trim();
    if (!t) {
      setTitleDraft(listTitle);
      return;
    }
    if (t === listTitle) return;
    try {
      await updateListTitle({ listId: listIdParam, title: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update title");
    }
  }

  return {
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    titleInputRef,
    handleSaveTitle,
  };
}
