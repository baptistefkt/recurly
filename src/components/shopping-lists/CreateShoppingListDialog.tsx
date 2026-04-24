import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type MembershipRow = { teamId: Id<"teams">; teamName: string };

export function CreateShoppingListDialog({
  open,
  onOpenChange,
  memberships,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberships: MembershipRow[] | undefined;
  onCreated: (listId: Id<"shoppingLists">) => void;
}) {
  const createList = useMutation(api.shoppingLists.createList);
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState<"personal" | Id<"teams">>("personal");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      const id = await createList({
        title,
        teamId: newScope === "personal" ? undefined : newScope,
      });
      setNewTitle("");
      onOpenChange(false);
      setNewScope("personal");
      onCreated(id);
      toast.success("List created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create list");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>New shopping list</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="list-title">Title</Label>
              <Input
                id="list-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Groceries"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select
                value={newScope === "personal" ? "personal" : newScope}
                onValueChange={(v) =>
                  setNewScope(v === "personal" ? "personal" : (v as Id<"teams">))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  {(memberships ?? []).map((m) => (
                    <SelectItem key={m.teamId} value={m.teamId}>
                      {m.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
