import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function ShoppingListsHero({
  onNewList,
  showArchived,
  onShowArchivedChange,
}: {
  onNewList: () => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your lists
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Checklists with suggestions and real-time sync for teams. Open a card to edit.
          Everything saves automatically.
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full gap-2 rounded-3xl px-6 shadow-sm sm:w-auto"
          onClick={onNewList}
        >
          <Plus className="h-5 w-5" />
          New list
        </Button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:justify-end">
          <Checkbox
            id="lists-show-archived"
            checked={showArchived}
            onCheckedChange={(v) => onShowArchivedChange(v === true)}
          />
          Show archived lists
        </label>
      </div>
    </div>
  );
}
