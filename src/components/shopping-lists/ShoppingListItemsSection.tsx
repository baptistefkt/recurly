import type { Id } from "../../../convex/_generated/dataModel";
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
  return (
    <div className="min-w-0 border-t border-border/50">
      <ul ref={attachItemsListAnimation} className="flex min-w-0 flex-col">
        {items?.length === 0 ? (
          <li className="border-b border-border/50 py-8 text-center text-sm text-muted-foreground">
            No items yet.
          </li>
        ) : (
          items?.map((item) => (
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
          ))
        )}
      </ul>
    </div>
  );
}
