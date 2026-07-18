import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ShoppingListItemRow, type ShoppingListItemRowModel } from "./ShoppingListItemRow";

function SortableShoppingListItemRow({
  item,
  editing,
  editText,
  onEditTextChange,
  editInputRef,
  onBlurCommit,
  onKeyDownEdit,
  onStartEdit,
  onToggleComplete,
  onDelete,
  sortableEnabled,
  showDragHandle,
  hideCheckbox,
}: {
  item: ShoppingListItemRowModel;
  editing: boolean;
  editText: string;
  onEditTextChange: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onBlurCommit: () => void;
  onKeyDownEdit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartEdit: () => void;
  onToggleComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  sortableEnabled: boolean;
  showDragHandle: boolean;
  hideCheckbox: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id, disabled: !sortableEnabled });

  return (
    <ShoppingListItemRow
      item={item}
      editing={editing}
      editText={editText}
      onEditTextChange={onEditTextChange}
      editInputRef={editInputRef}
      onBlurCommit={onBlurCommit}
      onKeyDownEdit={onKeyDownEdit}
      onStartEdit={onStartEdit}
      onToggleComplete={onToggleComplete}
      onDelete={onDelete}
      setSortableNodeRef={setNodeRef}
      setDragHandleRef={setActivatorNodeRef}
      isDragging={isDragging}
      showDragHandle={showDragHandle}
      hideCheckbox={hideCheckbox}
      sortableStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragHandleProps={
        sortableEnabled
          ? {
              ...attributes,
              ...listeners,
            }
          : undefined
      }
    />
  );
}

export function ShoppingListItemsSection({
  items,
  attachItemsListAnimation,
  setItemsListAnimationEnabled,
  editingItemId,
  editText,
  setEditText,
  editInputRef,
  scheduleCommitEditFromBlur,
  commitEditItem,
  setEditingItemId,
  onToggleComplete,
  onDelete,
  onReorderActive,
  reorderMode,
  isSmUp,
}: {
  items: ShoppingListItemRowModel[] | undefined;
  attachItemsListAnimation: (element: HTMLElement | null) => void;
  setItemsListAnimationEnabled: (enabled: boolean) => void;
  editingItemId: Id<"shoppingListItems"> | null;
  editText: string;
  setEditText: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  scheduleCommitEditFromBlur: () => void;
  commitEditItem: () => Promise<void>;
  setEditingItemId: (id: Id<"shoppingListItems"> | null) => void;
  onToggleComplete: (itemId: Id<"shoppingListItems">) => Promise<void>;
  onDelete: (itemId: Id<"shoppingListItems">) => Promise<void>;
  onReorderActive: (orderedItemIds: Id<"shoppingListItems">[]) => Promise<void>;
  reorderMode: boolean;
  isSmUp: boolean;
}) {
  const serverActive = useMemo(
    () => items?.filter((item) => !item.completed) ?? [],
    [items]
  );
  const completed = useMemo(
    () => items?.filter((item) => item.completed) ?? [],
    [items]
  );
  const serverActiveIds = useMemo(
    () => serverActive.map((item) => item._id),
    [serverActive]
  );

  const [activeOrderIds, setActiveOrderIds] = useState<Id<"shoppingListItems">[] | null>(
    null
  );
  const activeOrderIdsRef = useRef<Id<"shoppingListItems">[] | null>(null);

  useEffect(() => {
    activeOrderIdsRef.current = activeOrderIds;
  }, [activeOrderIds]);

  useEffect(() => {
    if (activeOrderIds === null) return;
    const serverSet = new Set(serverActiveIds);
    const stillValid =
      activeOrderIds.length === serverActiveIds.length &&
      activeOrderIds.every((id) => serverSet.has(id));
    if (!stillValid) {
      activeOrderIdsRef.current = null;
      setActiveOrderIds(null);
    }
  }, [activeOrderIds, serverActiveIds]);

  const activeIds = activeOrderIds ?? serverActiveIds;
  const activeById = useMemo(
    () => new Map(serverActive.map((item) => [item._id, item])),
    [serverActive]
  );
  const active = activeIds
    .map((id) => activeById.get(id))
    .filter((item): item is ShoppingListItemRowModel => item !== undefined);

  const isEmpty = items !== undefined && items.length === 0;
  const sortableEnabled = isSmUp || reorderMode;
  // Mobile reorder mode: grips instead of checkboxes. Desktop: always both.
  const showDragHandle = sortableEnabled;
  const hideCheckbox = !isSmUp && reorderMode;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function rowEditProps(item: ShoppingListItemRowModel) {
    return {
      editing: editingItemId === item._id,
      editText,
      onEditTextChange: setEditText,
      editInputRef,
      onBlurCommit: scheduleCommitEditFromBlur,
      onKeyDownEdit: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commitEditItem();
        }
        if (e.key === "Escape") {
          setEditingItemId(null);
        }
      },
      onStartEdit: () => {
        setEditingItemId(item._id);
        setEditText(item.text);
      },
      onToggleComplete: () => onToggleComplete(item._id),
      onDelete: () => onDelete(item._id),
    };
  }

  function handleDragStart(_event: DragStartEvent) {
    setItemsListAnimationEnabled(false);
    activeOrderIdsRef.current = serverActiveIds;
    setActiveOrderIds(serverActiveIds);
  }

  function handleDragEnd() {
    const nextIds = activeOrderIdsRef.current ?? serverActiveIds;
    const changed =
      nextIds.length === serverActiveIds.length &&
      nextIds.some((id, index) => id !== serverActiveIds[index]);

    activeOrderIdsRef.current = null;
    setActiveOrderIds(null);

    if (changed) {
      void onReorderActive(nextIds);
    }

    // Re-enable after the optimistic DOM update so auto-animate does not
    // fight dnd-kit transforms; later add/complete/remove still animate.
    requestAnimationFrame(() => {
      setItemsListAnimationEnabled(true);
    });
  }

  function handleDragCancel() {
    activeOrderIdsRef.current = null;
    setActiveOrderIds(null);
    requestAnimationFrame(() => {
      setItemsListAnimationEnabled(true);
    });
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              onDragOver={(event) => {
                if (!sortableEnabled) return;
                const { active: dragged, over } = event;
                if (!over || dragged.id === over.id) return;
                setActiveOrderIds((current) => {
                  const ids = current ?? serverActiveIds;
                  const oldIndex = ids.indexOf(dragged.id as Id<"shoppingListItems">);
                  const newIndex = ids.indexOf(over.id as Id<"shoppingListItems">);
                  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return ids;
                  const next = arrayMove(ids, oldIndex, newIndex);
                  activeOrderIdsRef.current = next;
                  return next;
                });
              }}
            >
              <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
                {active.map((item) => (
                  <SortableShoppingListItemRow
                    key={item._id}
                    item={item}
                    sortableEnabled={sortableEnabled}
                    showDragHandle={showDragHandle}
                    hideCheckbox={hideCheckbox}
                    {...rowEditProps(item)}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
            {completed.map((item) => (
              <ShoppingListItemRow key={item._id} item={item} {...rowEditProps(item)} />
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
