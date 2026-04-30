import type { KeyboardEvent } from "react";
import { Archive, ArchiveRestore, Check, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { previewLineClass } from "./listsPageUtils";
import { Button } from "../ui/button";

type PreviewItem = { _id: Id<"shoppingListItems">; text: string; completed: boolean };

type ListSummary = {
  _id: Id<"shoppingLists">;
  title: string;
  teamId?: Id<"teams">;
  isArchived?: boolean;
};

export function ShoppingListPreviewCard({
  list,
  previewItems,
  totalItemCount,
  scopeLabel,
  onOpen,
  onToggleArchive,
  onRequestDelete,
}: {
  list: ListSummary;
  previewItems: PreviewItem[];
  totalItemCount: number;
  scopeLabel: string;
  onOpen: () => void;
  onToggleArchive: () => void | Promise<void>;
  onRequestDelete: () => void;
}) {
  function getMoreCount(maxVisibleItems: number) {
    const visibleItems = Math.min(previewItems.length, maxVisibleItems);
    return Math.max(0, totalItemCount - visibleItems);
  }

  const moreBase = getMoreCount(5);
  const moreSm = getMoreCount(8);
  const moreLg = getMoreCount(10);
  const moreXl = getMoreCount(previewItems.length);

  function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open shopping list ${list.title}`}
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "relative group flex flex-col rounded-4xl border border-border/60 bg-background/90 p-5 text-left shadow-sm ring-1 ring-transparent transition-all duration-250 cursor-pointer",
        "hover:border-primary/50 hover:bg-background hover:shadow-md hover:ring-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight text-foreground group-hover:text-foreground">
          {list.title}
        </h2>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {list.isArchived ? (
            <Badge variant="secondary" className="font-normal">
              Archived
            </Badge>
          ) : null}
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {scopeLabel}
          </Badge>
        </div>
      </div>
      <ul className="mt-4 min-h-26 space-y-1.5 text-sm" aria-label="Preview items">
        {previewItems.length === 0 ? (
          <li className="text-muted-foreground italic">No items yet — tap to add</li>
        ) : (
          previewItems.map((item, index) => (
            <li
              key={item._id}
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-muted-foreground",
                item.completed && "line-through opacity-60",
                previewLineClass(index)
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-border/80 bg-input/90 text-primary-foreground shadow-none",
                  item.completed ? "border-primary bg-primary" : "border-transparent"
                )}
              >
                {item.completed ? (
                  <Check className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground/80">{item.text}</span>
            </li>
          ))
        )}
      </ul>
      {moreBase > 0 ? (
        <p className="mt-3 text-xs font-medium text-muted-foreground sm:hidden">+{moreBase} more</p>
      ) : null}
      {moreSm > 0 ? (
        <p className="mt-3 hidden text-xs font-medium text-muted-foreground sm:block lg:hidden">
          +{moreSm} more
        </p>
      ) : null}
      {moreLg > 0 ? (
        <p className="mt-3 hidden text-xs font-medium text-muted-foreground lg:block xl:hidden">
          +{moreLg} more
        </p>
      ) : null}
      {moreXl > 0 ? (
        <p className="mt-3 hidden text-xs font-medium text-muted-foreground xl:block">
          +{moreXl} more
        </p>
      ) : null}
      <div
        className={cn(
          "absolute right-4 bottom-4 flex gap-2 transition-opacity duration-250",
          "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={list.isArchived ? "Restore list" : "Archive list"}
          onClick={(e) => {
            e.stopPropagation();
            void onToggleArchive();
          }}
        >
          {list.isArchived ? (
            <ArchiveRestore className="text-muted-foreground" />
          ) : (
            <Archive className="text-muted-foreground" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete list"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
        >
          <Trash className="text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
