import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import type { ShoppingAutocompleteRow } from "@/components/shopping/ShoppingItemCombobox";
import { CreateShoppingListDialog } from "@/components/shopping-lists/CreateShoppingListDialog";
import { DeleteShoppingListAlert } from "@/components/shopping-lists/DeleteShoppingListAlert";
import { ShoppingListDetailDialog } from "@/components/shopping-lists/ShoppingListDetailDialog";
import { ShoppingListPreviewsSection } from "@/components/shopping-lists/ShoppingListPreviewsSection";
import { ShoppingListsHero } from "@/components/shopping-lists/ShoppingListsHero";
import { ShoppingListsPageHeader } from "@/components/shopping-lists/ShoppingListsPageHeader";
import { useDebouncedShoppingListPrefix } from "@/components/shopping-lists/useDebouncedShoppingListPrefix";
import { useShoppingListAddItem } from "@/components/shopping-lists/useShoppingListAddItem";
import { useShoppingListItemEdit } from "@/components/shopping-lists/useShoppingListItemEdit";
import { useShoppingListSuggestionsWithStale } from "@/components/shopping-lists/useShoppingListSuggestionsWithStale";
import { useShoppingListTitleEdit } from "@/components/shopping-lists/useShoppingListTitleEdit";
import { useShoppingListUrlState } from "@/components/shopping-lists/useShoppingListUrlState";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export function ListsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [deleteListTargetId, setDeleteListTargetId] = useState<Id<"shoppingLists"> | null>(null);

  const previews = useQuery(api.shoppingLists.listMinePreviews, {
    includeArchived: showArchived,
    previewLimit: 12,
  });

  const { listIdParam, openList, closeList, navigate } = useShoppingListUrlState(previews);

  const user = useQuery(api.auth.loggedInUser);
  const memberships = useQuery(api.teams.myMemberships, {});

  const selectedList = useQuery(
    api.shoppingLists.get,
    listIdParam ? { listId: listIdParam } : "skip"
  );
  const items = useQuery(
    api.shoppingLists.listItems,
    listIdParam ? { listId: listIdParam } : "skip"
  );
  const aliases = useQuery(
    api.shoppingLists.listShoppingAliases,
    listIdParam ? { listId: listIdParam } : "skip"
  );

  const updateListTitle = useMutation(api.shoppingLists.updateListTitle);
  const setListArchived = useMutation(api.shoppingLists.setListArchived);
  const addItem = useMutation(api.shoppingLists.addItem);
  const reuseShoppingItem = useMutation(api.shoppingLists.reuseShoppingItem);
  const updateItemText = useMutation(api.shoppingLists.updateItemText);
  const deleteItem = useMutation(api.shoppingLists.deleteItem);
  const toggleItemComplete = useMutation(api.shoppingLists.toggleItemComplete);

  const {
    addDraft,
    ambiguous,
    setAmbiguous,
    setAddDraft,
    setAddDraftClearAmbiguous,
    handleAddItem,
    addItemFromSuggestion,
  } = useShoppingListAddItem({
    listIdParam,
    items,
    aliases,
    addItem,
    reuseShoppingItem,
  });

  const { debouncedSuggestionPrefix } = useDebouncedShoppingListPrefix(listIdParam, addDraft);

  const suggestions = useQuery(
    api.shoppingLists.listSuggestions,
    listIdParam ? { listId: listIdParam, prefix: debouncedSuggestionPrefix } : "skip"
  );

  const suggestionsForAutocomplete = useShoppingListSuggestionsWithStale(
    listIdParam,
    suggestions
  );

  const suggestionRows: ShoppingAutocompleteRow[] = useMemo(
    () =>
      suggestionsForAutocomplete.map((s) => ({
        rowKey: s.rowKey,
        displayLabel: s.displayLabel,
        reuseItemId: s.reuseItemId,
      })),
    [suggestionsForAutocomplete]
  );

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of memberships ?? []) {
      m.set(row.teamId, row.teamName);
    }
    return m;
  }, [memberships]);

  const listTitle = selectedList?.title ?? "";
  const titleEdit = useShoppingListTitleEdit(listIdParam, listTitle, updateListTitle);
  const itemEdit = useShoppingListItemEdit(listIdParam, items, updateItemText);

  const handleToggleArchived = useCallback(async () => {
    if (!listIdParam || !selectedList) return;
    try {
      await setListArchived({
        listId: listIdParam,
        isArchived: !(selectedList.isArchived ?? false),
      });
      toast.success(selectedList.isArchived ? "List restored" : "List archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [listIdParam, selectedList, setListArchived]);

  const handlePreviewToggleArchive = useCallback(
    async (listId: Id<"shoppingLists">, isArchived: boolean) => {
      try {
        await setListArchived({ listId, isArchived: !isArchived });
        toast.success(isArchived ? "List restored" : "List archived");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [setListArchived]
  );

  const openDeleteListAlert = useCallback((listId: Id<"shoppingLists">) => {
    setDeleteListTargetId(listId);
    setDeleteListOpen(true);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteListOpen(open);
    if (!open) setDeleteListTargetId(null);
  }, []);

  const focusOrDismissAddInput = useCallback(() => {
    requestAnimationFrame(() => {
      const input = document.getElementById("shopping-list-add-item") as
        | HTMLInputElement
        | null;
      if (!input) return;
      const isDesktopPrecisionPointer =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (isDesktopPrecisionPointer) {
        input.focus();
      } else {
        input.blur();
      }
    });
  }, []);

  const onAmbiguousAcceptReuse = useCallback(async () => {
    if (!listIdParam || !ambiguous) return;
    try {
      await reuseShoppingItem({
        itemId: ambiguous.itemId,
        typedText: ambiguous.typed,
      });
      setAmbiguous(null);
      setAddDraft("");
      focusOrDismissAddInput();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [
    listIdParam,
    ambiguous,
    reuseShoppingItem,
    setAmbiguous,
    setAddDraft,
    focusOrDismissAddInput,
  ]);

  const onAmbiguousKeepOriginal = useCallback(async () => {
    if (!listIdParam || !ambiguous) return;
    try {
      await addItem({ listId: listIdParam, text: ambiguous.typed });
      setAmbiguous(null);
      setAddDraft("");
      focusOrDismissAddInput();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [
    listIdParam,
    ambiguous,
    addItem,
    setAmbiguous,
    setAddDraft,
    focusOrDismissAddInput,
  ]);

  const onToggleItemComplete = useCallback(
    async (itemId: Id<"shoppingListItems">) => {
      try {
        await toggleItemComplete({ itemId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [toggleItemComplete]
  );

  const onDeleteItem = useCallback(
    async (itemId: Id<"shoppingListItems">) => {
      try {
        await deleteItem({ itemId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [deleteItem]
  );

  const detailOpen = Boolean(listIdParam);
  const listDetailLoading = Boolean(listIdParam && selectedList === undefined);
  const listDetailMissing = Boolean(listIdParam && selectedList === null);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <ShoppingListsPageHeader
        user={user ?? undefined}
        navigate={navigate}
        onOpenAccountSettings={() => navigate("/settings")}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <ShoppingListsHero
          onNewList={() => setCreateOpen(true)}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
        />

        <div className="mt-10">
          <ShoppingListPreviewsSection
            previews={previews}
            teamNameById={teamNameById}
            onOpenList={openList}
            onNewList={() => setCreateOpen(true)}
            onToggleListArchive={handlePreviewToggleArchive}
            onRequestDeleteList={openDeleteListAlert}
          />
        </div>
      </div>

      <ShoppingListDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeList();
        }}
        listDetailLoading={listDetailLoading}
        listDetailMissing={listDetailMissing}
        listIdParam={listIdParam}
        selectedList={selectedList ?? null}
        items={items}
        editingTitle={titleEdit.editingTitle}
        setEditingTitle={titleEdit.setEditingTitle}
        titleDraft={titleEdit.titleDraft}
        setTitleDraft={titleEdit.setTitleDraft}
        titleInputRef={titleEdit.titleInputRef}
        listTitle={listTitle}
        handleSaveTitle={titleEdit.handleSaveTitle}
        onToggleArchived={handleToggleArchived}
        onRequestDelete={() => {
          if (listIdParam) openDeleteListAlert(listIdParam);
        }}
        addDraft={addDraft}
        setAddDraftClearAmbiguous={setAddDraftClearAmbiguous}
        suggestionRows={suggestionRows}
        onPickSuggestion={addItemFromSuggestion}
        onSubmitCustom={handleAddItem}
        ambiguous={ambiguous}
        onAmbiguousAcceptReuse={onAmbiguousAcceptReuse}
        onAmbiguousKeepOriginal={onAmbiguousKeepOriginal}
        editingItemId={itemEdit.editingItemId}
        setEditingItemId={itemEdit.setEditingItemId}
        editText={itemEdit.editText}
        setEditText={itemEdit.setEditText}
        editInputRef={itemEdit.editInputRef}
        commitEditItem={itemEdit.commitEditItem}
        scheduleCommitEditFromBlur={itemEdit.scheduleCommitEditFromBlur}
        onToggleItemComplete={onToggleItemComplete}
        onDeleteItem={onDeleteItem}
      />

      <CreateShoppingListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        memberships={memberships}
        onCreated={openList}
      />

      <DeleteShoppingListAlert
        open={deleteListOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        listId={deleteListTargetId}
        onDeleted={(deletedId) => {
          if (deletedId === listIdParam) closeList();
        }}
      />
    </div>
  );
}
