import { Archive, ArchiveRestore, MoreVertical, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ShoppingListDetailDialogHeader({
  editingTitle,
  setEditingTitle,
  titleDraft,
  setTitleDraft,
  titleInputRef,
  listTitle,
  handleSaveTitle,
  isArchived,
  onToggleArchived,
  onRequestDelete,
}: {
  editingTitle: boolean;
  setEditingTitle: (v: boolean) => void;
  titleDraft: string;
  setTitleDraft: (v: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  listTitle: string;
  handleSaveTitle: () => Promise<void>;
  isArchived: boolean;
  onToggleArchived: () => Promise<void>;
  onRequestDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
      <div className="min-w-0 flex-1">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              void handleSaveTitle();
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setTitleDraft(listTitle);
                setEditingTitle(false);
              }
            }}
            className={cn(
              "w-full min-w-0 bg-transparent pb-1 text-xl font-semibold tracking-tight outline-none sm:text-2xl",
              "border-0 border-b-2 border-primary/50 placeholder:text-muted-foreground/60",
              "focus-visible:border-primary focus-visible:ring-0"
            )}
            placeholder="List title"
            aria-label="List title"
          />
        ) : (
          <button
            type="button"
            className={cn(
              "w-full max-w-full rounded-xl px-1 py-1 text-left text-xl font-semibold tracking-tight transition-colors outline-none sm:text-2xl",
              "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
              !listTitle.trim() && "text-muted-foreground"
            )}
            onClick={() => setEditingTitle(true)}
            aria-label="Edit list title"
          >
            {listTitle.trim() ? listTitle : "Untitled list"}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="List actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void onToggleArchived()}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRequestDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>
    </div>
  );
}
