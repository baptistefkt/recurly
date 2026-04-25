import { useMutation, useQuery } from "convex/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  Pencil,
  Repeat,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AssigneeAvatarGroup } from "@/components/teams/AssigneeAvatarGroup";
import { CompletionTimeline } from "./CompletionTimeline";
import { TaskDueCountdown } from "./TaskDueCountdown";
import { formatDistanceToNow } from "@/lib/dateUtils";
import { ColoredAvatarFallback } from "@/components/shared/ColoredAvatarFallback";
import { getUserInitials } from "@/lib/userDisplay";
import { humanizeRecurrence } from "@/lib/recurrenceFormat";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tagColorClass } from "@/lib/tagColors";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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

const taskSnapshotCache = new Map<Id<"tasks">, unknown>();

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stepTaskPhotoIndex(
  current: number | null,
  direction: "prev" | "next",
  length: number
): number {
  if (length <= 0) return 0;
  const i = current === null ? 0 : current;
  if (direction === "prev") {
    return i <= 0 ? length - 1 : i - 1;
  }
  return i >= length - 1 ? 0 : i + 1;
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
      <div className="min-w-0 text-sm leading-relaxed text-foreground max-sm:pl-6.5">
        {children}
      </div>
    </div>
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxContainerRef = useRef<HTMLDivElement>(null);
  const cachedTask = taskSnapshotCache.get(taskId) as
    | Exclude<typeof task, undefined | null>
    | undefined;
  const taskForRender = task === undefined ? cachedTask ?? undefined : task;

  const galleryUrls = useMemo(() => {
    if (taskForRender === undefined || taskForRender === null) return [];
    return (taskForRender.imageUrls ?? []).filter(
      (u): u is string => typeof u === "string" && u.length > 0
    );
  }, [taskForRender]);

  const onLightboxKeyDownCapture = useCallback(
    (e: ReactKeyboardEvent) => {
      const len = galleryUrls.length;
      if (len <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLightboxIndex((i) => stepTaskPhotoIndex(i, "prev", len));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLightboxIndex((i) => stepTaskPhotoIndex(i, "next", len));
      }
    },
    [galleryUrls.length]
  );

  useEffect(() => {
    if (task !== undefined && task !== null) {
      taskSnapshotCache.set(taskId, task);
    }
  }, [task, taskId]);

  useEffect(() => {
    setLightboxIndex(null);
  }, [taskId]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex >= galleryUrls.length) {
      setLightboxIndex(null);
      return;
    }
    lightboxContainerRef.current?.focus({ preventScroll: true });
  }, [lightboxIndex, galleryUrls.length]);

  const now = Date.now();
  const isOverdue =
    taskForRender !== undefined &&
    taskForRender !== null &&
    taskForRender.nextDueAt !== null &&
    taskForRender.nextDueAt < now;
  const isDueToday =
    taskForRender !== undefined &&
    taskForRender !== null &&
    taskForRender.nextDueAt !== null &&
    taskForRender.nextDueAt >= now &&
    taskForRender.nextDueAt < now + 24 * 60 * 60 * 1000;

  const visibility = taskForRender?.visibility ?? "personal";

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
          className="sm:max-w-3xl"
          onPointerDownOutside={(e) => {
            if (lightboxIndex !== null) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (lightboxIndex !== null) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (lightboxIndex !== null) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (lightboxIndex !== null) {
              e.preventDefault();
              setLightboxIndex(null);
            }
          }}
        >
          {taskForRender === undefined ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading task…</p>
            </div>
          ) : taskForRender === null ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Task not found.</div>
          ) : (
            (() => {
              const task = taskForRender;
              return (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
              </DialogHeader>

              <div className="max-h-[min(70vh,32rem)] min-w-0 overflow-y-auto overflow-x-hidden">
                <div className="space-y-4 pb-2">
                  <div className="my-4">
                    <div className="rounded-3xl bg-muted/50 px-4 py-3.5 dark:bg-muted/35">
                      <div className="flex gap-3">
                        <FileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-80"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-heading text-sm font-medium text-foreground">
                            Description
                          </p>
                          {task.description?.trim() ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                              {task.description.trim()}
                            </p>
                          ) : (
                            <p className="text-sm italic text-muted-foreground">
                              No description
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {galleryUrls.length > 0 && (
                    <div className="my-4">
                      <div className="rounded-3xl bg-muted/50 px-4 py-3.5 dark:bg-muted/35">
                        <div className="flex gap-3">
                          <ImageIcon
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-80"
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="font-heading text-sm font-medium text-foreground">
                              Images
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
                              {galleryUrls.map((url, i) => (
                                <button
                                  key={`${url}-${i}`}
                                  type="button"
                                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-background outline-none ring-offset-background transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                  onClick={() => setLightboxIndex(i)}
                                  aria-label={`View image ${i + 1} full size`}
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <TaskDueCountdown
                    nextDueAt={task.nextDueAt}
                    isArchived={!!task.isArchived}
                    busy={completing}
                    onMarkComplete={async () => {
                      setCompleting(true);
                      try {
                        await markComplete({ taskId });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not mark complete");
                        throw err;
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
                          <Avatar size="sm">
                            {task.createdBy.image ? (
                              <AvatarImage src={task.createdBy.image} alt="" />
                            ) : null}
                            <ColoredAvatarFallback seed={task.createdBy.userId}>
                              {getUserInitials(task.createdBy.name, task.createdBy.email)}
                            </ColoredAvatarFallback>
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
                          <Badge variant="secondary">
                            Team{task.teamName ? ` · ${task.teamName}` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Personal</Badge>
                        )}
                        {task.isArchived && <Badge variant="outline">Archived</Badge>}
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                        {isDueToday && !isOverdue && (
                          <Badge variant="secondary">Due today</Badge>
                        )}
                      </div>
                    </PropertyRow>

                    <PropertyRow icon={BarChart3} label="Points">
                      <span className={task.points === undefined ? "text-muted-foreground" : undefined}>
                        {task.points === undefined ? "None" : task.points}
                      </span>
                    </PropertyRow>

                    <PropertyRow
                      icon={task.recurrenceType === "once" ? CalendarClock : Repeat}
                      label={task.recurrenceType === "once" ? "Due" : "Recurrence"}
                    >
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
                            <Badge
                              key={`${tag}-${i}`}
                              variant="outline"
                              className={tagColorClass(tag)}
                            >
                              {tag}
                            </Badge>
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

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={onEdit} disabled={deleting}>
                  <Pencil className="h-4 w-4" />
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
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
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
                    <Trash2 className="h-4 w-4" />
                    Delete permanently
                  </Button>
                )}
              </DialogFooter>
            </>
              );
            })()
          )}

          {galleryUrls.length > 0 &&
            lightboxIndex !== null &&
            galleryUrls[lightboxIndex] && (
              <div
                ref={lightboxContainerRef}
                tabIndex={-1}
                role="region"
                aria-label={`Image ${lightboxIndex + 1} of ${galleryUrls.length}. Use arrow keys for previous and next.`}
                className="fixed inset-0 z-300 flex items-center justify-center bg-black/92 p-4 outline-none"
                onClick={() => setLightboxIndex(null)}
                onKeyDownCapture={onLightboxKeyDownCapture}
              >
                <div className="absolute right-3 top-3 z-1 flex flex-wrap items-center justify-end gap-2">
                  <a
                    href={galleryUrls[lightboxIndex]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Open in new tab
                  </a>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(null);
                    }}
                    aria-label="Close full size image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {galleryUrls.length > 1 && (
                  <>
                    <div className="absolute top-1/2 left-2 z-1 -translate-y-1/2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        aria-label="Previous image"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex((i) =>
                            stepTaskPhotoIndex(i, "prev", galleryUrls.length)
                          );
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="absolute top-1/2 right-2 z-1 -translate-y-1/2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        aria-label="Next image"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex((i) =>
                            stepTaskPhotoIndex(i, "next", galleryUrls.length)
                          );
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                )}
                <img
                  src={galleryUrls[lightboxIndex]}
                  alt={`Image ${lightboxIndex + 1} of ${galleryUrls.length}`}
                  className="max-h-[70vh] max-w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Delete this task permanently?
              </span>
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
