import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COLORS = [
  { name: "gray", label: "Gray", cls: "bg-gray-400" },
  { name: "red", label: "Red", cls: "bg-red-400" },
  { name: "orange", label: "Orange", cls: "bg-orange-400" },
  { name: "yellow", label: "Yellow", cls: "bg-yellow-400" },
  { name: "green", label: "Green", cls: "bg-green-400" },
  { name: "blue", label: "Blue", cls: "bg-blue-400" },
  { name: "purple", label: "Purple", cls: "bg-purple-400" },
  { name: "pink", label: "Pink", cls: "bg-pink-400" },
];

type RecurrenceType = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
type RecurrenceUnit = "days" | "weeks" | "months";

function effectiveVis(t: { visibility?: "personal" | "team" } | null | undefined) {
  return t?.visibility ?? "personal";
}

export function TaskModal({
  taskId,
  onClose,
  listMode,
  activeTeamId,
}: {
  taskId: Id<"tasks"> | null;
  onClose: () => void;
  listMode: "personal" | "team";
  activeTeamId: Id<"teams"> | null;
}) {
  const existingTask = useQuery(api.tasks.get, taskId ? { taskId } : "skip");
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("weeks");
  const [color, setColor] = useState("gray");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [assigneeUserIds, setAssigneeUserIds] = useState<Id<"users">[]>([]);

  const teamIdForMembers =
    existingTask && effectiveVis(existingTask) === "team" && existingTask.teamId
      ? existingTask.teamId
      : !taskId && listMode === "team" && activeTeamId && shareWithTeam
        ? activeTeamId
        : taskId &&
            listMode === "team" &&
            activeTeamId &&
            shareWithTeam &&
            existingTask &&
            effectiveVis(existingTask) === "personal"
          ? activeTeamId
          : null;

  const members = useQuery(
    api.teams.members,
    teamIdForMembers ? { teamId: teamIdForMembers } : "skip"
  );

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description ?? "");
      setRecurrenceType(existingTask.recurrenceType as RecurrenceType);
      setRecurrenceInterval(existingTask.recurrenceInterval ?? 1);
      setRecurrenceUnit((existingTask.recurrenceUnit as RecurrenceUnit) ?? "weeks");
      setColor(existingTask.color ?? "gray");
      setShareWithTeam(effectiveVis(existingTask) === "team");
      setAssigneeUserIds(existingTask.assigneeUserIds ?? []);
    } else {
      setShareWithTeam(listMode === "team" && !!activeTeamId);
      setAssigneeUserIds([]);
    }
  }, [existingTask, listMode, activeTeamId]);

  const isEdit = !!taskId;
  const showSharing =
    (listMode === "team" && activeTeamId !== null) ||
    (isEdit && effectiveVis(existingTask) === "team");

  function toggleAssignee(userId: Id<"users">) {
    setAssigneeUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const customFields =
        recurrenceType === "custom"
          ? { recurrenceInterval, recurrenceUnit }
          : { recurrenceInterval: undefined, recurrenceUnit: undefined };

      const teamIdForTask =
        shareWithTeam && (activeTeamId ?? existingTask?.teamId)
          ? (activeTeamId ?? existingTask?.teamId)!
          : undefined;
      const visibility =
        shareWithTeam && teamIdForTask ? ("team" as const) : ("personal" as const);
      const assignees =
        visibility === "team" && assigneeUserIds.length > 0
          ? assigneeUserIds
          : undefined;

      if (isEdit && taskId) {
        await updateTask({
          taskId,
          title: title.trim(),
          description: description.trim() || undefined,
          recurrenceType,
          color,
          ...customFields,
          visibility,
          teamId: visibility === "team" ? teamIdForTask : undefined,
          assigneeUserIds:
            visibility === "team" ? assigneeUserIds : undefined,
        });
        toast.success("Task updated");
      } else {
        if (visibility === "team" && !activeTeamId) {
          toast.error("Select a team first");
          setSaving(false);
          return;
        }
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          recurrenceType,
          color,
          ...customFields,
          visibility,
          teamId: visibility === "team" ? activeTeamId! : undefined,
          assigneeUserIds: assignees,
        });
        toast.success("Task created");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!taskId) return;
    setSaving(true);
    setConfirmDelete(false);
    try {
      await removeTask({ taskId });
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto gap-0 p-0 sm:max-w-md">
          <DialogHeader className="space-y-0 border-b px-6 py-4 text-left">
            <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task name</Label>
              <Input
                id="task-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clean the bathroom"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-notes">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="task-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra details..."
                rows={2}
                className="resize-none"
              />
            </div>

            {showSharing && (
              <div className="space-y-3">
                <Label>Visibility</Label>
                <div className="flex rounded-md border border-input p-1 text-sm">
                  <Button
                    type="button"
                    variant={!shareWithTeam ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setShareWithTeam(false)}
                  >
                    Only me
                  </Button>
                  <Button
                    type="button"
                    variant={shareWithTeam ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setShareWithTeam(true)}
                  >
                    Whole team
                  </Button>
                </div>
                {shareWithTeam && members && members.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Assign to (optional)</p>
                    <div className="flex flex-col gap-2">
                      {members.map((m) => (
                        <label
                          key={m.userId}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={assigneeUserIds.includes(m.userId)}
                            onCheckedChange={() => toggleAssignee(m.userId)}
                          />
                          {m.name || m.email || "Member"}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Repeats</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["daily", "weekly", "biweekly", "monthly", "custom"] as RecurrenceType[]).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={recurrenceType === r ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => setRecurrenceType(r)}
                  >
                    {r === "biweekly" ? "2 wk" : r === "custom" ? "Custom" : r}
                  </Button>
                ))}
              </div>
              {recurrenceType === "custom" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    className="w-16 text-center"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                  />
                  <div className="flex flex-1 rounded-md border border-input p-0.5">
                    {(["days", "weeks", "months"] as RecurrenceUnit[]).map((u) => (
                      <Button
                        key={u}
                        type="button"
                        variant={recurrenceUnit === u ? "default" : "ghost"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setRecurrenceUnit(u)}
                      >
                        {u}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-transform",
                      c.cls,
                      color === c.name ? "ring-2 ring-offset-2 ring-ring scale-110" : "hover:scale-105"
                    )}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={saving || !title.trim()}>
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create task"}
              </Button>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task and all completion history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={saving} onClick={() => void handleDelete()}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
