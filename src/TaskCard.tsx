import { useMutation } from "convex/react";
import { CalendarClock, CalendarDays, Check, Repeat } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AssigneeAvatarGroup, type TaskAssigneePreview } from "./AssigneeAvatarGroup";
import { formatDistanceToNow } from "./dateUtils";
import { humanizeRecurrence } from "./recurrenceFormat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TaskWithMeta = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  points?: number;
  recurrenceType: string;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceDayOfWeek?: number;
  recurrenceDaysOfWeek?: number[];
  dueAt?: number;
  isArchived?: boolean;
  visibility?: "personal" | "team";
  teamName?: string | null;
  assigneeUserIds?: Id<"users">[];
  assignees?: TaskAssigneePreview[];
  tags?: string[];
  lastCompletedAt: number | null;
  completionCount: number;
  nextDueAt: number | null;
};

export function TaskCard({
  task,
  onDetail,
}: {
  task: TaskWithMeta;
  onDetail: () => void;
}) {
  const markComplete = useMutation(api.completions.markComplete);
  const now = Date.now();
  const isOverdue = task.nextDueAt !== null && task.nextDueAt < now;
  const isDueToday =
    task.nextDueAt !== null &&
    task.nextDueAt >= now &&
    task.nextDueAt < now + 24 * 60 * 60 * 1000;

  const description = task.description?.trim();
  const userTags = task.tags ?? [];
  const visibleTags = userTags.slice(0, 3);
  const moreTagCount = userTags.length - visibleTags.length;

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex min-h-[8.5rem] flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDetail();
        }
      }}
    >
      <Card size="sm">
        <CardContent>
          <div className="flex flex-1 gap-2.5">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-h-5.5 flex-wrap items-center gap-1.5">
                {(task.visibility ?? "personal") === "team" ? (
                  <Badge variant="secondary">{task.teamName?.trim() || "Team"}</Badge>
                ) : (
                  <Badge variant="secondary">Personal</Badge>
                )}
                <Badge variant="outline">Pts {task.points ?? 1}</Badge>
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                {isDueToday && !isOverdue && (
                  <Badge variant="secondary">Due today</Badge>
                )}
                {task.assignees && task.assignees.length > 0 && (
                  <AssigneeAvatarGroup assignees={task.assignees} className="ml-0.5" />
                )}
              </div>

              <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
                {task.title}
              </h3>

              <p
                className="h-5 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5 text-muted-foreground"
                title={description || undefined}
              >
                {description || "\u00a0"}
              </p>

              {visibleTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {visibleTags.map((tag, i) => (
                    <Badge key={`${tag}-${i}`} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                  {moreTagCount > 0 && (
                    <Badge variant="secondary">+{moreTagCount}</Badge>
                  )}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {task.recurrenceType === "once" ? (
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  ) : (
                    <Repeat className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  )}
                  {humanizeRecurrence(task)}
                </span>
                {task.lastCompletedAt ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    Last: {formatDistanceToNow(task.lastCompletedAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    Never done
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-11 shrink-0 flex-col items-end justify-between self-stretch">
              <div
                className={cn(
                  "min-h-5 text-right text-xs font-medium leading-5",
                  !task.nextDueAt && "invisible",
                  task.nextDueAt && isOverdue && "text-destructive",
                  task.nextDueAt && isDueToday && !isOverdue && "text-amber-600",
                  task.nextDueAt && !isOverdue && !isDueToday && "text-muted-foreground"
                )}
                aria-hidden={!task.nextDueAt}
              >
                {task.nextDueAt
                  ? isOverdue
                    ? formatDistanceToNow(task.nextDueAt) + " ago"
                    : "in " + formatDistanceToNow(task.nextDueAt)
                  : "\u00a0"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Mark complete"
                onClick={async (e) => {
                  e.stopPropagation();
                  await markComplete({ taskId: task._id });
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

