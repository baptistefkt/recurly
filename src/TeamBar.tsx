import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Settings } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { TeamSettingsModal } from "./TeamSettingsModal";
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
export function TeamBar({
  selectedTeamId,
  onSelectTeam,
}: {
  selectedTeamId: Id<"teams"> | null;
  onSelectTeam: (teamId: Id<"teams"> | null) => void;
}) {
  const user = useQuery(api.auth.loggedInUser);
  const memberships = useQuery(api.teams.myMemberships);
  const setLastTeam = useMutation(api.teams.setLastSelectedTeam);
  const createTeam = useMutation(api.teams.create);

  const [settingsTeamId, setSettingsTeamId] = useState<Id<"teams"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || memberships === undefined || user === undefined) return;
    initRef.current = true;
    const saved = user?.lastSelectedTeamId;
    if (
      saved &&
      memberships.some((m: { teamId: Id<"teams"> }) => m.teamId === saved)
    ) {
      onSelectTeam(saved);
    }
  }, [memberships, user, onSelectTeam]);

  async function handleSelect(teamId: Id<"teams"> | null) {
    onSelectTeam(teamId);
    try {
      await setLastTeam({ teamId });
    } catch {
      /* ignore */
    }
  }

  async function handleCreateTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const teamId = await createTeam({ name: newTeamName.trim() });
      toast.success("Team created");
      setCreateOpen(false);
      setNewTeamName("");
      await handleSelect(teamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create team");
    } finally {
      setCreating(false);
    }
  }

  const settingsMembership = memberships?.find((m) => m.teamId === settingsTeamId);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            View
          </span>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant={selectedTeamId === null ? "default" : "outline"}
              size="sm"
              className="rounded-lg"
              onClick={() => void handleSelect(null)}
            >
              Personal
            </Button>
            {(memberships ?? []).map((m) => (
              <Button
                key={m.teamId}
                type="button"
                variant={selectedTeamId === m.teamId ? "default" : "outline"}
                size="sm"
                className="max-w-[140px] truncate rounded-lg"
                title={m.teamName}
                onClick={() => void handleSelect(m.teamId)}
              >
                {m.teamName}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary"
            disabled={creating}
            onClick={() => setCreateOpen(true)}
          >
            + New team
          </Button>
          {selectedTeamId !== null && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Team settings"
              onClick={() => setSettingsTeamId(selectedTeamId)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleCreateTeamSubmit}>
            <DialogHeader>
              <DialogTitle>New team</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor="new-team-name">Team name</Label>
              <Input
                id="new-team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Home"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newTeamName.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {settingsTeamId && settingsMembership && (
        <TeamSettingsModal
          teamId={settingsTeamId}
          teamName={settingsMembership.teamName}
          isAdmin={settingsMembership.role === "admin"}
          onClose={() => setSettingsTeamId(null)}
        />
      )}
    </>
  );
}
