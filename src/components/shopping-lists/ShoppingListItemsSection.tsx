import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ShoppingListItemRow, type ShoppingListItemRowModel } from "./ShoppingListItemRow";

export function ShoppingListItemsSection({
  items,
  attachItemsListAnimation,
  editingItemId,
  editText,
  setEditText,
  editInputRef,
  scheduleCommitEditFromBlur,
  commitEditItem,
  setEditingItemId,
  onToggleComplete,
  onDelete,
}: {
  items: ShoppingListItemRowModel[] | undefined;
  attachItemsListAnimation: (element: HTMLElement | null) => void;
  editingItemId: Id<"shoppingListItems"> | null;
  editText: string;
  setEditText: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  scheduleCommitEditFromBlur: () => void;
  commitEditItem: () => Promise<void>;
  setEditingItemId: (id: Id<"shoppingListItems"> | null) => void;
  onToggleComplete: (itemId: Id<"shoppingListItems">) => Promise<void>;
  onDelete: (itemId: Id<"shoppingListItems">) => Promise<void>;
}) {
  const active = items?.filter((item) => !item.completed) ?? [];
  const completed = items?.filter((item) => item.completed) ?? [];
  const isEmpty = items !== undefined && items.length === 0;

  function renderRow(item: ShoppingListItemRowModel) {
    return (
      <ShoppingListItemRow
        key={item._id}
        item={item}
        editing={editingItemId === item._id}
        editText={editText}
        onEditTextChange={setEditText}
        editInputRef={editInputRef}
        onBlurCommit={scheduleCommitEditFromBlur}
        onKeyDownEdit={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commitEditItem();
          }
          if (e.key === "Escape") {
            setEditingItemId(null);
          }
        }}
        onStartEdit={() => {
          setEditingItemId(item._id);
          setEditText(item.text);
        }}
        onToggleComplete={() => onToggleComplete(item._id)}
        onDelete={() => onDelete(item._id)}
      />
    );
  }

  return (
    <div className="min-w-0 border-t border-border/50">
      <ul ref={attachItemsListAnimation} className="flex min-w-0 flex-col">
        {isEmpty ? (
          <li className="border-b border-border/50 py-8 text-center text-sm text-muted-foreground">
            No items yet.
          </li>
        ) : (
          <>
            {active.map(renderRow)}
            {completed.length > 0 ? (
              <li key="completed-separator" className="pointer-events-none list-none">
                <div
                  role="separator"
                  aria-label={`Completed, ${completed.length}`}
                  className={cn(
                    "px-1",
                    active.length > 0 ? "mt-8 pt-1 pb-1.5" : "pt-2 pb-1.5"
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Completed
                    <span className="ml-1.5 tabular-nums text-muted-foreground/70">
                      {completed.length}
                    </span>
                  </p>
                </div>
              </li>
            ) : null}
            {completed.map(renderRow)}
          </>
        )}
      </ul>
    </div>
  );
}
