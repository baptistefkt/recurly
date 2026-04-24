import { Button } from "@/components/ui/button";
import type { Id } from "../../../convex/_generated/dataModel";

export function AmbiguousItemMatchBanner({
  label,
  onAcceptReuse,
  onKeepOriginal,
}: {
  label: string;
  onAcceptReuse: () => Promise<void>;
  onKeepOriginal: () => Promise<void>;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground">
      <span>
        Did you mean <span className="font-medium text-foreground">{label}</span>?
      </span>
      <Button type="button" size="sm" className="h-8 rounded-full" onClick={() => void onAcceptReuse()}>
        Accept
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-full"
        onClick={() => void onKeepOriginal()}
      >
        Keep original
      </Button>
    </div>
  );
}

export type AmbiguousMatch = {
  itemId: Id<"shoppingListItems">;
  label: string;
  typed: string;
};
