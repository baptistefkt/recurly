import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

export function ShoppingListDetailFooter() {
  return (
    <div className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-3 sm:px-6">
      <DialogClose asChild>
        <Button type="button" variant="secondary" className="w-full rounded-3xl sm:w-auto">
          Done
        </Button>
      </DialogClose>
    </div>
  );
}
