import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export type ShoppingListItemRowModel = {
  _id: Id<"shoppingListItems">;
  text: string;
  completed: boolean;
};

export function ShoppingListItemRow({
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
}) {
  return (
    <li
      className={cn(
        "group flex min-h-10 items-center gap-2.5 border-b border-border/50 py-1.5 pr-1 pl-1 transition-colors last:border-b-0 sm:min-h-8 sm:gap-2 sm:py-1 sm:pr-0.5 sm:pl-0.5",
        "hover:bg-muted/40",
        item.completed && "text-muted-foreground"
      )}
    >
      <Checkbox
        checked={item.completed}
        onCheckedChange={() => void onToggleComplete()}
        className={cn("size-5 shrink-0 sm:size-4", item.completed && "opacity-60")}
      />
      {editing && !item.completed ? (
        <Input
          ref={editInputRef}
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          onBlur={onBlurCommit}
          onKeyDown={onKeyDownEdit}
          className="h-9 min-h-9 flex-1 self-center rounded-3xl border border-transparent bg-input/50 px-3 text-[15px] shadow-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:h-8 sm:min-h-8 sm:text-sm"
        />
      ) : item.completed ? (
        <span className="ml-1.5 flex min-w-0 flex-1 cursor-default items-center self-stretch truncate py-1 text-left text-[15px] leading-snug select-none line-through opacity-60 sm:py-0.5 sm:text-sm">
          {item.text}
        </span>
      ) : (
        <button
          type="button"
          className="ml-1.5 flex min-w-0 flex-1 items-center self-stretch truncate py-1 text-left text-[15px] leading-snug sm:py-0.5 sm:text-sm"
          onMouseDown={(e) => {
            // Avoid focus on this control so blur→commit doesn't fire when swapping to the input.
            e.preventDefault();
          }}
          onClick={onStartEdit}
        >
          {item.text}
        </button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100 sm:size-6 sm:opacity-60"
        aria-label="Remove item"
        onClick={() => void onDelete()}
      >
        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </Button>
    </li>
  );
}
