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
        "group flex min-h-8 items-center gap-2 border-b border-border/50 py-1 pr-0.5 pl-0.5 transition-colors last:border-b-0",
        "hover:bg-muted/40",
        item.completed && "text-muted-foreground"
      )}
    >
      <Checkbox
        checked={item.completed}
        onCheckedChange={() => void onToggleComplete()}
        className={cn("shrink-0", item.completed && "opacity-60")}
      />
      {editing && !item.completed ? (
        <Input
          ref={editInputRef}
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          onBlur={onBlurCommit}
          onKeyDown={onKeyDownEdit}
          className="h-8 min-h-8 flex-1 self-center rounded-3xl border border-transparent bg-input/50 px-3 text-sm shadow-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      ) : item.completed ? (
        <span className="ml-1.5 flex min-w-0 flex-1 cursor-default items-center self-stretch truncate py-0.5 text-left text-sm leading-snug select-none line-through opacity-60">
          {item.text}
        </span>
      ) : (
        <button
          type="button"
          className="ml-1.5 flex min-w-0 flex-1 items-center self-stretch truncate py-0.5 text-left text-sm leading-snug"
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
        size="icon-xs"
        className="shrink-0 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
        aria-label="Remove item"
        onClick={() => void onDelete()}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
