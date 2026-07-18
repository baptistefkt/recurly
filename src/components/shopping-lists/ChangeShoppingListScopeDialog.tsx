import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "../../../convex/_generated/dataModel";

type MembershipRow = { teamId: Id<"teams">; teamName: string };

export function ChangeShoppingListScopeDialog({
  open,
  onOpenChange,
  teamId,
  memberships,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams"> | undefined;
  memberships: MembershipRow[] | undefined;
  onSave: (teamId: Id<"teams"> | null) => Promise<void>;
}) {
  const [draftScope, setDraftScope] = useState<"personal" | Id<"teams">>("personal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftScope(teamId ?? "personal");
  }, [open, teamId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const next = draftScope === "personal" ? null : draftScope;
    const current = teamId ?? null;
    if (next === current) {
      onOpenChange(false);
      return;
    }
    try {
      setSaving(true);
      await onSave(next);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={(e) => void handleSave(e)}>
          <DialogHeader>
            <DialogTitle>Change list scope</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="change-list-scope">Scope</Label>
            <Select
              value={draftScope === "personal" ? "personal" : draftScope}
              onValueChange={(v) =>
                setDraftScope(v === "personal" ? "personal" : (v as Id<"teams">))
              }
            >
              <SelectTrigger id="change-list-scope">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
