import { useState, useEffect, useMemo } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DueDateTimeFields } from "@/components/DueDateTimeFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, X } from "lucide-react";

const MAX_TAG_LEN = 40;
const MAX_TAG_COUNT = 20;
const MIN_TASK_POINTS = 1;
const MAX_TASK_POINTS = 5;

type RecurrenceType =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom"
  | "weeklyDays"
  | "once";
type RecurrenceUnit = "days" | "weeks" | "months";
const WEEKDAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
] as const;

function effectiveVis(t: { visibility?: "personal" | "team" } | null | undefined) {
  return t?.visibility ?? "personal";
}

function defaultDueAtMs() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.getTime();
}

function mergeTagIntoList(list: string[], raw: string): string[] {
  const t = raw.trim().slice(0, MAX_TAG_LEN);
  if (!t) return list;
  if (list.some((x) => x.toLowerCase() === t.toLowerCase())) return list;
  if (list.length >= MAX_TAG_COUNT) return list;
  return [...list, t];
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
  const distinctTagLabels = useQuery(api.tasks.distinctTags, {});
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<number>(MIN_TASK_POINTS);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("weeks");
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([1]);
  const [dueAtMs, setDueAtMs] = useState(defaultDueAtMs);
  const [recurrenceStartAtMs, setRecurrenceStartAtMs] = useState<number | null>(null);
  const [recurrenceEndAtMs, setRecurrenceEndAtMs] = useState<number | null>(null);
  const [scheduleWindowOpen, setScheduleWindowOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [assigneeUserIds, setAssigneeUserIds] = useState<Id<"users">[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  const tagSuggestions = useMemo(() => {
    if (!distinctTagLabels?.length) return [];
    return distinctTagLabels.filter(
      (t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase())
    );
  }, [distinctTagLabels, tags]);

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
      setPoints(existingTask.points ?? MIN_TASK_POINTS);
      setRecurrenceType(existingTask.recurrenceType as RecurrenceType);
      setRecurrenceInterval(existingTask.recurrenceInterval ?? 1);
      setRecurrenceUnit((existingTask.recurrenceUnit as RecurrenceUnit) ?? "weeks");
      const weekdays = existingTask.recurrenceDaysOfWeek ?? [];
      if (weekdays.length > 0) {
        setRecurrenceDaysOfWeek(weekdays);
      } else if (existingTask.recurrenceDayOfWeek !== undefined) {
        setRecurrenceDaysOfWeek([existingTask.recurrenceDayOfWeek]);
      } else {
        setRecurrenceDaysOfWeek([1]);
      }
      setShareWithTeam(effectiveVis(existingTask) === "team");
      setAssigneeUserIds(existingTask.assigneeUserIds ?? []);
      setTags(existingTask.tags ?? []);
      if (existingTask.recurrenceType === "once") {
        setDueAtMs(existingTask.dueAt ?? defaultDueAtMs());
        setRecurrenceStartAtMs(null);
        setRecurrenceEndAtMs(null);
      } else {
        setRecurrenceStartAtMs(existingTask.recurrenceStartAt ?? null);
        setRecurrenceEndAtMs(existingTask.recurrenceEndAt ?? null);
      }
    } else {
      setShareWithTeam(listMode === "team" && !!activeTeamId);
      setPoints(MIN_TASK_POINTS);
      setAssigneeUserIds([]);
      setRecurrenceDaysOfWeek([1]);
      setDueAtMs(defaultDueAtMs());
      setRecurrenceStartAtMs(null);
      setRecurrenceEndAtMs(null);
    }
    setScheduleWindowOpen(false);
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

  function toggleWeekday(day: number) {
    setRecurrenceDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (recurrenceType === "once") {
        if (!Number.isFinite(dueAtMs)) {
          toast.error("Pick a due date and time");
          setSaving(false);
          return;
        }
      } else if (
        recurrenceStartAtMs !== null &&
        recurrenceEndAtMs !== null &&
        recurrenceEndAtMs < recurrenceStartAtMs
      ) {
        toast.error("End date must be after start date");
        setSaving(false);
        return;
      }
      if (
        !Number.isInteger(points) ||
        points < MIN_TASK_POINTS ||
        points > MAX_TASK_POINTS
      ) {
        toast.error("Points must be between 1 and 5");
        setSaving(false);
        return;
      }

      const recurrenceFields =
        recurrenceType === "once"
          ? {
              recurrenceInterval: undefined,
              recurrenceUnit: undefined,
              recurrenceDaysOfWeek: undefined,
              dueAt: dueAtMs,
              recurrenceStartAt: null,
              recurrenceEndAt: null,
            }
          : recurrenceType === "custom"
            ? {
                recurrenceInterval,
                recurrenceUnit,
                recurrenceDaysOfWeek: undefined,
                dueAt: undefined,
                recurrenceStartAt: recurrenceStartAtMs,
                recurrenceEndAt: recurrenceEndAtMs,
              }
            : recurrenceType === "weeklyDays"
              ? {
                  recurrenceInterval: undefined,
                  recurrenceUnit: undefined,
                  recurrenceDaysOfWeek,
                  dueAt: undefined,
                  recurrenceStartAt: recurrenceStartAtMs,
                  recurrenceEndAt: recurrenceEndAtMs,
                }
              : {
                  recurrenceInterval: undefined,
                  recurrenceUnit: undefined,
                  recurrenceDaysOfWeek: undefined,
                  dueAt: undefined,
                  recurrenceStartAt: recurrenceStartAtMs,
                  recurrenceEndAt: recurrenceEndAtMs,
                };
      if (recurrenceType === "weeklyDays" && recurrenceDaysOfWeek.length === 0) {
        toast.error("Pick at least one weekday");
        setSaving(false);
        return;
      }

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
          points,
          recurrenceType,
          ...recurrenceFields,
          visibility,
          teamId: visibility === "team" ? teamIdForTask : undefined,
          assigneeUserIds:
            visibility === "team" ? assigneeUserIds : undefined,
          tags,
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
          points,
          recurrenceType,
          ...recurrenceFields,
          visibility,
          teamId: visibility === "team" ? activeTeamId! : undefined,
          assigneeUserIds: assignees,
          tags,
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
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto pb-0">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              />
            </div>

            <div className="space-y-2">
              <Label>Points</Label>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: MAX_TASK_POINTS }, (_, index) => {
                  const value = index + 1;
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={points === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPoints(value)}
                    >
                      {value}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Use 1 for small tasks and 5 for high-impact tasks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-tags">
                Tags <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setTags((prev) =>
                            prev.filter(
                              (x) => x.toLowerCase() !== tag.toLowerCase()
                            )
                          )
                        }
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                id="task-tags"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setTags((prev) => {
                      const next = mergeTagIntoList(prev, tagDraft);
                      return next;
                    });
                    setTagDraft("");
                  }
                }}
                placeholder="Type a tag and press Enter"
                disabled={tags.length >= MAX_TAG_COUNT}
              />
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="w-full text-[11px] text-muted-foreground">
                    Suggestions
                  </span>
                  {tagSuggestions.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTags((prev) => mergeTagIntoList(prev, t));
                      }}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {showSharing && (
              <div className="space-y-3">
                <Label>Visibility</Label>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant={!shareWithTeam ? "default" : "outline"}
                    onClick={() => setShareWithTeam(false)}
                  >
                    Only me
                  </Button>
                  <Button
                    type="button"
                    variant={shareWithTeam ? "default" : "outline"}
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
              <Label>{recurrenceType === "once" ? "Due" : "Repeats"}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "daily",
                    "weekly",
                    "biweekly",
                    "monthly",
                    "custom",
                    "weeklyDays",
                    "once",
                  ] as RecurrenceType[]
                ).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={recurrenceType === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setRecurrenceType(r);
                      if (r === "once") setDueAtMs((prev) => (Number.isFinite(prev) ? prev : defaultDueAtMs()));
                    }}
                  >
                    {r === "biweekly"
                      ? "2 wk"
                      : r === "custom"
                        ? "Custom"
                        : r === "weeklyDays"
                          ? "Days"
                          : r === "once"
                            ? "One-time"
                            : r}
                  </Button>
                ))}
              </div>
              {recurrenceType === "once" && (
                <DueDateTimeFields
                  className="mt-2"
                  valueMs={dueAtMs}
                  onChange={setDueAtMs}
                />
              )}
              {recurrenceType === "weeklyDays" && (
                <div className="mt-2 space-y-2">
                  <span className="text-sm text-muted-foreground">On these days</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const active = recurrenceDaysOfWeek.includes(day.value);
                      return (
                        <Button
                          key={day.value}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleWeekday(day.value)}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {recurrenceType === "custom" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <div className="w-16 shrink-0 [&_input]:text-center">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      className="h-8 text-sm"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["days", "weeks", "months"] as RecurrenceUnit[]).map((u) => (
                      <Button
                        key={u}
                        type="button"
                        variant={recurrenceUnit === u ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRecurrenceUnit(u)}
                      >
                        {u}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {recurrenceType !== "once" && (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Schedule window (optional)</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setScheduleWindowOpen((prev) => !prev)}
                      aria-label={scheduleWindowOpen ? "Hide schedule window" : "Show schedule window"}
                    >
                      {scheduleWindowOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {scheduleWindowOpen && (
                    <>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={recurrenceStartAtMs !== null}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRecurrenceStartAtMs((prev) => prev ?? defaultDueAtMs());
                              } else {
                                setRecurrenceStartAtMs(null);
                              }
                            }}
                          />
                          Start date
                        </label>
                        {recurrenceStartAtMs !== null && (
                          <DueDateTimeFields valueMs={recurrenceStartAtMs} onChange={setRecurrenceStartAtMs} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={recurrenceEndAtMs !== null}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRecurrenceEndAtMs(
                                  (prev) => prev ?? recurrenceStartAtMs ?? defaultDueAtMs()
                                );
                              } else {
                                setRecurrenceEndAtMs(null);
                              }
                            }}
                          />
                          End date
                        </label>
                        {recurrenceEndAtMs !== null && (
                          <DueDateTimeFields valueMs={recurrenceEndAtMs} onChange={setRecurrenceEndAtMs} />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-2 flex gap-2 border-t border-border bg-popover px-6 py-3 sm:justify-start">
              <div className="min-w-0 flex-1 [&>button]:w-full">
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? "Saving..." : isEdit ? "Save changes" : "Create task"}
                </Button>
              </div>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </DialogFooter>
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
