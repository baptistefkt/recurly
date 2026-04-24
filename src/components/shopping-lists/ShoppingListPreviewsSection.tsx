import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PreviewRow } from "./listsPageUtils";
import { ShoppingListPreviewCard } from "./ShoppingListPreviewCard";

export function ShoppingListPreviewsSection({
  previews,
  teamNameById,
  onOpenList,
  onNewList,
  onToggleListArchive,
  onRequestDeleteList,
}: {
  previews: PreviewRow[] | undefined;
  teamNameById: Map<string, string>;
  onOpenList: (id: Id<"shoppingLists">) => void;
  onNewList: () => void;
  onToggleListArchive: (listId: Id<"shoppingLists">, isArchived: boolean) => void | Promise<void>;
  onRequestDeleteList: (listId: Id<"shoppingLists">) => void;
}) {
  if (previews === undefined) {
    return <p className="text-center text-sm text-muted-foreground">Loading lists…</p>;
  }

  if (previews.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-background/70 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-muted ring-1 ring-border/60">
            <ListChecks className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">No lists yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a list for groceries, errands, or shared team shopping. You can pick personal
              or a team when you create it.
            </p>
          </div>
          <Button type="button" size="lg" className="rounded-3xl px-8" onClick={onNewList}>
            <Plus className="h-4 w-4" />
            Create your first list
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
      {previews.map(({ list, previewItems, totalItemCount }) => {
        const scopeLabel =
          list.teamId === undefined ? "Personal" : (teamNameById.get(list.teamId) ?? "Team");
        return (
          <ShoppingListPreviewCard
            key={list._id}
            list={list}
            previewItems={previewItems}
            totalItemCount={totalItemCount}
            scopeLabel={scopeLabel}
            onOpen={() => onOpenList(list._id)}
            onToggleArchive={() => onToggleListArchive(list._id, list.isArchived ?? false)}
            onRequestDelete={() => onRequestDeleteList(list._id)}
          />
        );
      })}
    </div>
  );
}
