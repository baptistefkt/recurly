import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function DeleteShoppingListAlert({
  open,
  onOpenChange,
  listId,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: Id<"shoppingLists"> | null;
  /** Called with the deleted list id after a successful delete (before dialog state is cleared). */
  onDeleted: (deletedListId: Id<"shoppingLists">) => void;
}) {
  const removeList = useMutation(api.shoppingLists.removeList);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this list?</AlertDialogTitle>
          <AlertDialogDescription>
            All items and suggestions for this list will be removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              if (!listId) return;
              const deletedId = listId;
              try {
                await removeList({ listId });
                onOpenChange(false);
                onDeleted(deletedId);
                toast.success("List deleted");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
