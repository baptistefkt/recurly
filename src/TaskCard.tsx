import { useMutation } from "convex/react";
import { CalendarDays, Check, Repeat } from "lucide-react";
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
  recurrenceType: string;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceDayOfWeek?: number;
  recurrenceDaysOfWeek?: number[];
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
    <Card
      className={cn(
        "flex min-h-[9.25rem] flex-col cursor-pointer border border-border border-l-4 bg-card shadow-none transition-shadow hover:shadow-sm",
        "border-l-primary/30",
        isOverdue && "border-t-destructive/40 border-r-destructive/40 border-b-destructive/40 bg-destructive/5"
      )}
      onClick={onDetail}
    >
      <CardContent className="flex flex-1 gap-3 px-4 py-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-h-[1.375rem] flex-wrap items-center gap-1.5">
            {(task.visibility ?? "personal") === "team" ? (
              <Badge
                variant="secondary"
                className="border-indigo-200 bg-indigo-50 text-[10px] font-semibold text-indigo-700"
              >
                {task.teamName?.trim() || "Team"}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700"
              >
                Personal
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="shrink-0 text-xs font-medium">
                Overdue
              </Badge>
            )}
            {isDueToday && !isOverdue && (
              <Badge
                variant="secondary"
                className="shrink-0 border-amber-200 bg-amber-100 text-xs font-medium text-amber-800"
              >
                Due today
              </Badge>
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
                <Badge
                  key={`${tag}-${i}`}
                  variant="outline"
                  className="max-w-[8rem] truncate px-1.5 py-0 text-[10px] font-normal"
                >
                  {tag}
                </Badge>
              ))}
              {moreTagCount > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                  +{moreTagCount}
                </Badge>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
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
            className="group h-8 w-8 shrink-0 rounded-full hover:border-primary hover:bg-primary hover:text-primary-foreground"
            title="Mark complete"
            onClick={async (e) => {
              e.stopPropagation();
              await markComplete({ taskId: task._id });
            }}
          >
            <Check className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

