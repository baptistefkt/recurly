import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Clock,
  History,
  Pencil,
  Repeat,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  UserPlus,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AssigneeAvatarGroup } from "./AssigneeAvatarGroup";
import { CompletionTimeline } from "./CompletionTimeline";
import { TaskDueCountdown } from "./TaskDueCountdown";
import { formatDistanceToNow } from "./dateUtils";
import { getUserInitials } from "@/lib/userDisplay";
import { humanizeRecurrence } from "./recurrenceFormat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Notion-style row: icon + label (muted) | value. No card chrome. */
function PropertyRow({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-10 gap-y-1.5 py-4 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <span className="leading-snug">{label}</span>
      </div>
      <div className="min-w-0 text-sm leading-relaxed text-foreground max-sm:pl-[1.625rem]">
        {children}
      </div>
    </div>
  );
}

function TagPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export function TaskDetailModal({
  taskId,
  onClose,
  onEdit,
}: {
  taskId: Id<"tasks">;
  onClose: () => void;
  onEdit: () => void;
}) {
  const task = useQuery(api.tasks.get, { taskId });
  const completions = useQuery(api.completions.listForTask, { taskId, limit: 50 });
  const markComplete = useMutation(api.completions.markComplete);
  const archiveTask = useMutation(api.tasks.archive);
  const unarchiveTask = useMutation(api.tasks.unarchive);
  const removeTask = useMutation(api.tasks.remove);
  const [completing, setCompleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const now = Date.now();
  const isOverdue = task && task.nextDueAt !== null && task.nextDueAt < now;
  const isDueToday =
    task &&
    task.nextDueAt !== null &&
    task.nextDueAt >= now &&
    task.nextDueAt < now + 24 * 60 * 60 * 1000;

  const visibility = task?.visibility ?? "personal";

  async function handleDelete() {
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await removeTask({ taskId });
      toast.success("Task deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent
          className={cn(
            "flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full",
            task === undefined && "min-h-[200px]"
          )}
        >
          {task === undefined ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading task…</p>
            </div>
          ) : task === null ? (
            <div className="px-8 py-12 text-center text-sm text-muted-foreground">Task not found.</div>
          ) : (
            <>
              <DialogHeader
                className={cn(
                  "space-y-0 border-b border-l-4 px-6 pb-5 pt-6 text-left sm:pl-6",
                  "border-l-primary/30"
                )}
              >
                <DialogTitle className="pr-8 text-2xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
                  {task.title}
                </DialogTitle>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto">
                
                <div className="px-6 py-2 pb-6">

                <div className="my-4 rounded-xl bg-slate-50 px-6 py-4 dark:bg-muted/40">
                  <h3 className="font-medium text-foreground">Description</h3>
                  {task.description?.trim() ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {task.description.trim()}
                    </p>
                  ) : (
                    <span className="italic text-muted-foreground">No description</span>
                  )}
                </div>

                <TaskDueCountdown
                  nextDueAt={task.nextDueAt}
                  isArchived={!!task.isArchived}
                  busy={completing}
                  onMarkComplete={async () => {
                    setCompleting(true);
                    try {
                      await markComplete({ taskId });
                    } finally {
                      setCompleting(false);
                    }
                  }}
                />

                  <div className="divide-y divide-border/50">
                    <PropertyRow icon={Clock} label="Created">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <time dateTime={new Date(task._creationTime).toISOString()}>
                          {formatDateTime(task._creationTime)}
                        </time>
                        <span className="text-muted-foreground">,&nbsp;</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border/60 text-[10px]">
                            {task.createdBy.image ? (
                              <AvatarImage src={task.createdBy.image} alt="" />
                            ) : null}
                            <AvatarFallback className="bg-muted text-[10px] font-medium">
                              {getUserInitials(task.createdBy.name, task.createdBy.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {task.createdBy.name?.trim() ||
                              task.createdBy.email ||
                              "Unknown user"}
                          </span>
                        </div>
                      </div>
                    </PropertyRow>

                    <PropertyRow icon={Sparkles} label="Status">
                      <div className="flex flex-wrap items-center gap-2">
                        {visibility === "team" ? (
                          <Badge
                            variant="secondary"
                            className="rounded-md border-amber-200/80 bg-amber-50 font-medium text-amber-950"
                          >
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Team
                            {task.teamName ? ` · ${task.teamName}` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-md font-medium">
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                            Personal
                          </Badge>
                        )}
                        {task.isArchived && (
                          <TagPill className="border-amber-200/60 bg-amber-50/90 text-amber-950">
                            Archived
                          </TagPill>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="rounded-md">
                            Overdue
                          </Badge>
                        )}
                        {isDueToday && !isOverdue && (
                          <TagPill className="border-amber-200 bg-amber-100 text-amber-950">
                            Due today
                          </TagPill>
                        )}
                      </div>
                    </PropertyRow>

                    <PropertyRow icon={Repeat} label="Recurrence">
                      <div>
                        <p>{humanizeRecurrence(task)}</p>
                        {task.recurrenceType === "custom" && (
                          <p className="mt-1 text-muted-foreground">
                            Interval: every {task.recurrenceInterval ?? 1}{" "}
                            {task.recurrenceUnit ?? "days"}
                          </p>
                        )}
                      </div>
                    </PropertyRow>

                    <PropertyRow icon={CalendarClock} label="Next due">
                      {task.nextDueAt ? (
                        <div>
                          <p>{formatDateTime(task.nextDueAt)}</p>
                          <p
                            className={cn(
                              "mt-1 text-sm",
                              isOverdue && "text-destructive",
                              isDueToday && !isOverdue && "text-amber-700 dark:text-amber-500",
                              !isOverdue && !isDueToday && "text-muted-foreground"
                            )}
                          >
                            {isOverdue
                              ? `${formatDistanceToNow(task.nextDueAt)} overdue`
                              : `in ${formatDistanceToNow(task.nextDueAt)}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not scheduled</span>
                      )}
                    </PropertyRow>

                    <PropertyRow icon={Tag} label="Tags">
                      {task.tags && task.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, i) => (
                            <TagPill key={`${tag}-${i}`}>{tag}</TagPill>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </PropertyRow>

                    <PropertyRow icon={UserPlus} label="Assignees">
                      {task.assignees && task.assignees.length > 0 ? (
                        <AssigneeAvatarGroup assignees={task.assignees} max={8} />
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </PropertyRow>
                  </div>

                  <div className="mt-8 border-t border-border/50 pt-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Completion history
                      {completions !== undefined && completions.length > 0 && (
                        <span className="font-normal text-muted-foreground">
                          ({completions.length} shown
                          {task.completionCount > completions.length
                            ? ` · ${task.completionCount} total`
                            : ""}
                          )
                        </span>
                      )}
                    </div>
                    <CompletionTimeline
                      completions={completions ?? []}
                      taskId={taskId}
                      showHeading={false}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap gap-2 border-t px-6 py-4">
                <Button type="button" variant="secondary" onClick={onEdit} disabled={deleting}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={async () => {
                    if (task.isArchived) {
                      await unarchiveTask({ taskId });
                    } else {
                      await archiveTask({ taskId });
                    }
                    onClose();
                  }}
                >
                  {task.isArchived ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  )}
                </Button>
                {task.isArchived && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete permanently
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete this task permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task and all completion history forever. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
