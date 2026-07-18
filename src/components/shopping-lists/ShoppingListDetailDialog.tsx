import { useCallback, useEffect, useRef, useState } from "react";
import autoAnimate from "@formkit/auto-animate";
import type { ShoppingAutocompleteRow } from "@/components/shopping/ShoppingItemCombobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AmbiguousMatch } from "./AmbiguousItemMatchBanner";
import { ShoppingListAddItemBlock } from "./ShoppingListAddItemBlock";
import {
  ShoppingListDetailLoading,
  ShoppingListDetailUnavailable,
} from "./ShoppingListDetailPlaceholder";
import { ShoppingListDetailDialogHeader } from "./ShoppingListDetailDialogHeader";
import { ShoppingListDetailFooter } from "./ShoppingListDetailFooter";
import { ShoppingListItemsSection } from "./ShoppingListItemsSection";
import type { ShoppingListItemRowModel } from "./ShoppingListItemRow";

type SelectedListSummary = {
  title: string;
  isArchived?: boolean;
  userId: Id<"users">;
  teamId?: Id<"teams">;
};

type MembershipRow = { teamId: Id<"teams">; teamName: string };

export function ShoppingListDetailDialog({
  open,
  onOpenChange,
  listDetailLoading,
  listDetailMissing,
  listIdParam,
  selectedList,
  items,
  editingTitle,
  setEditingTitle,
  titleDraft,
  setTitleDraft,
  titleInputRef,
  listTitle,
  handleSaveTitle,
  onToggleArchived,
  onRequestDelete,
  memberships,
  canChangeScope,
  onScopeChange,
  addDraft,
  setAddDraftClearAmbiguous,
  suggestionRows,
  onPickSuggestion,
  onSubmitCustom,
  ambiguous,
  onAmbiguousAcceptReuse,
  onAmbiguousKeepOriginal,
  editingItemId,
  setEditingItemId,
  editText,
  setEditText,
  editInputRef,
  commitEditItem,
  scheduleCommitEditFromBlur,
  onToggleItemComplete,
  onDeleteItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listDetailLoading: boolean;
  listDetailMissing: boolean;
  listIdParam: Id<"shoppingLists"> | null;
  selectedList: SelectedListSummary | null | undefined;
  items: ShoppingListItemRowModel[] | undefined;
  editingTitle: boolean;
  setEditingTitle: (v: boolean) => void;
  titleDraft: string;
  setTitleDraft: (v: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  listTitle: string;
  handleSaveTitle: () => Promise<void>;
  onToggleArchived: () => Promise<void>;
  onRequestDelete: () => void;
  memberships: MembershipRow[] | undefined;
  canChangeScope: boolean;
  onScopeChange: (teamId: Id<"teams"> | null) => Promise<void>;
  addDraft: string;
  setAddDraftClearAmbiguous: (v: string) => void;
  suggestionRows: ShoppingAutocompleteRow[];
  onPickSuggestion: (row: ShoppingAutocompleteRow) => Promise<void>;
  onSubmitCustom: (text: string) => Promise<void>;
  ambiguous: AmbiguousMatch | null;
  onAmbiguousAcceptReuse: () => Promise<void>;
  onAmbiguousKeepOriginal: () => Promise<void>;
  editingItemId: Id<"shoppingListItems"> | null;
  setEditingItemId: (id: Id<"shoppingListItems"> | null) => void;
  editText: string;
  setEditText: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  commitEditItem: () => Promise<void>;
  scheduleCommitEditFromBlur: () => void;
  onToggleItemComplete: (itemId: Id<"shoppingListItems">) => Promise<void>;
  onDeleteItem: (itemId: Id<"shoppingListItems">) => Promise<void>;
}) {
  const animatedItemsListRef = useRef<WeakSet<HTMLElement>>(new WeakSet());
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

  const attachItemsListAnimation = useCallback((element: HTMLElement | null) => {
    if (!element || animatedItemsListRef.current.has(element)) return;
    autoAnimate(element, { duration: 200, easing: "ease-out" });
    animatedItemsListRef.current.add(element);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const updateInset = () => {
      const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKeyboardInsetPx(inset > 0 ? inset : 0);
    };

    updateInset();
    vv.addEventListener("resize", updateInset);
    vv.addEventListener("scroll", updateInset);
    return () => {
      vv.removeEventListener("resize", updateInset);
      vv.removeEventListener("scroll", updateInset);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {listDetailLoading ? (
          <ShoppingListDetailLoading />
        ) : listDetailMissing || !listIdParam || !selectedList ? (
          <ShoppingListDetailUnavailable />
        ) : (
          <>
            <ShoppingListDetailDialogHeader
              editingTitle={editingTitle}
              setEditingTitle={setEditingTitle}
              titleDraft={titleDraft}
              setTitleDraft={setTitleDraft}
              titleInputRef={titleInputRef}
              listTitle={listTitle}
              handleSaveTitle={handleSaveTitle}
              isArchived={selectedList.isArchived ?? false}
              onToggleArchived={onToggleArchived}
              onRequestDelete={onRequestDelete}
              teamId={selectedList.teamId}
              memberships={memberships}
              canChangeScope={canChangeScope}
              onScopeChange={onScopeChange}
            />

            <div
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6"
              style={{
                paddingBottom:
                  keyboardInsetPx > 0 ? `calc(1rem + ${keyboardInsetPx}px)` : undefined,
              }}
            >
              <div className="min-w-0 space-y-4 pb-4 pt-4">
                <ShoppingListAddItemBlock
                  listId={listIdParam}
                  addDraft={addDraft}
                  onAddDraftChange={setAddDraftClearAmbiguous}
                  suggestionRows={suggestionRows}
                  onPickSuggestion={onPickSuggestion}
                  onSubmitCustom={onSubmitCustom}
                  ambiguous={ambiguous}
                  onAmbiguousAcceptReuse={onAmbiguousAcceptReuse}
                  onAmbiguousKeepOriginal={onAmbiguousKeepOriginal}
                />

                <ShoppingListItemsSection
                  items={items}
                  attachItemsListAnimation={attachItemsListAnimation}
                  editingItemId={editingItemId}
                  editText={editText}
                  setEditText={setEditText}
                  editInputRef={editInputRef}
                  scheduleCommitEditFromBlur={scheduleCommitEditFromBlur}
                  commitEditItem={commitEditItem}
                  setEditingItemId={setEditingItemId}
                  onToggleComplete={onToggleItemComplete}
                  onDelete={onDeleteItem}
                />
              </div>
            </div>

            <ShoppingListDetailFooter />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
