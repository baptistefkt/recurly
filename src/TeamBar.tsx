import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Settings } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { TeamSettingsModal } from "./TeamSettingsModal";
import {
  filterToViewTabValue,
  taskListFilterToMutationView,
  viewTabValueToFilter,
  type TaskListFilter,
} from "./taskListFilter";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TeamBar({
  filter,
  onFilterChange,
  hasInitialScopeOverride,
  createTeamOpen,
  onCreateTeamOpenChange,
}: {
  filter: TaskListFilter;
  onFilterChange: (f: TaskListFilter) => void;
  hasInitialScopeOverride?: boolean;
  createTeamOpen: boolean;
  onCreateTeamOpenChange: (open: boolean) => void;
}) {
  const user = useQuery(api.auth.loggedInUser);
  const memberships = useQuery(api.teams.myMemberships);
  const setTaskListView = useMutation(api.teams.setTaskListView);
  const createTeam = useMutation(api.teams.create);

  const [settingsTeamId, setSettingsTeamId] = useState<Id<"teams"> | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || memberships === undefined || user == null) return;
    initRef.current = true;

    if (hasInitialScopeOverride) {
      if (
        filter.type === "team" &&
        !memberships.some((m: { teamId: Id<"teams"> }) => m.teamId === filter.teamId)
      ) {
        onFilterChange({ type: "personal" });
      }
      return;
    }

    const scope = user.taskListScope;
    const savedTeam = user.lastSelectedTeamId;
    const hasTeam =
      !!savedTeam && memberships.some((m: { teamId: Id<"teams"> }) => m.teamId === savedTeam);

    if (scope === "all") {
      onFilterChange({ type: "all" });
    } else if (scope === "team" && hasTeam) {
      onFilterChange({ type: "team", teamId: savedTeam });
    } else if (scope === "personal") {
      onFilterChange({ type: "personal" });
    } else if (scope === undefined && hasTeam) {
      onFilterChange({ type: "team", teamId: savedTeam });
    } else {
      onFilterChange({ type: "personal" });
    }
  }, [filter, hasInitialScopeOverride, memberships, onFilterChange, user]);

  async function persistView(next: TaskListFilter) {
    onFilterChange(next);
    try {
      await setTaskListView({ view: taskListFilterToMutationView(next) });
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
      onCreateTeamOpenChange(false);
      setNewTeamName("");
      onFilterChange({ type: "team", teamId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create team");
    } finally {
      setCreating(false);
    }
  }

  const settingsMembership = memberships?.find((m) => m.teamId === settingsTeamId);
  const selectedTeamId = filter.type === "team" ? filter.teamId : null;

  const tabValue = filterToViewTabValue(filter);
  const membershipIds = new Set((memberships ?? []).map((m) => m.teamId));
  const tabValueValid =
    tabValue === "all" ||
    tabValue === "personal" ||
    (tabValue.startsWith("team:") &&
      membershipIds.has(tabValue.slice("team:".length) as Id<'teams'>));
  const safeTabValue = tabValueValid ? tabValue : "personal";

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Tabs
          className="min-w-0 overflow-x-auto"
          value={safeTabValue}
          onValueChange={(v) => void persistView(viewTabValueToFilter(v))}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            {(memberships ?? []).map((m) => (
              <TabsTrigger key={m.teamId} value={`team:${m.teamId}`} title={m.teamName}>
                {m.teamName}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {selectedTeamId !== null && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Team settings"
            onClick={() => setSettingsTeamId(selectedTeamId)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={createTeamOpen} onOpenChange={onCreateTeamOpenChange}>
        <DialogContent>
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
              <Button type="button" variant="outline" onClick={() => onCreateTeamOpenChange(false)}>
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
