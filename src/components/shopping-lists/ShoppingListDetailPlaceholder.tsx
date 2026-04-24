import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

function CloseRow() {
  return (
    <div className="flex items-center justify-end border-b border-border/60 px-4 py-3 sm:px-5">
      <DialogClose asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </DialogClose>
    </div>
  );
}

export function ShoppingListDetailLoading() {
  return (
    <>
      <CloseRow />
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading…
      </div>
    </>
  );
}

export function ShoppingListDetailUnavailable() {
  return (
    <>
      <CloseRow />
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-sm text-muted-foreground sm:px-6">
        <p>This list is unavailable.</p>
        <DialogClose asChild>
          <Button type="button" variant="outline" className="rounded-3xl">
            Back to lists
          </Button>
        </DialogClose>
      </div>
    </>
  );
}
