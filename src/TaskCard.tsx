import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { formatDistanceToNow } from "./dateUtils";
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
  isArchived?: boolean;
  color?: string;
  visibility?: "personal" | "team";
  assigneeUserIds?: Id<"users">[];
  lastCompletedAt: number | null;
  completionCount: number;
  nextDueAt: number | null;
};

const COLORS: Record<string, string> = {
  gray: "bg-gray-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
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

  const colorDot = COLORS[task.color ?? "gray"] ?? COLORS.gray;

  return (
    <Card
      className={cn(
        "cursor-pointer shadow-none transition-shadow hover:shadow-sm",
        isOverdue && "border-destructive/40"
      )}
      onClick={onDetail}
    >
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", colorDot)} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{task.title}</span>
            {task.visibility === "team" && (
              <Badge variant="secondary" className="border-indigo-200 bg-indigo-50 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                Team
              </Badge>
            )}
            {task.assigneeUserIds && task.assigneeUserIds.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {task.assigneeUserIds.length} assigned
              </span>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="flex-shrink-0 text-xs font-medium">
                Overdue
              </Badge>
            )}
            {isDueToday && !isOverdue && (
              <Badge
                variant="secondary"
                className="flex-shrink-0 border-amber-200 bg-amber-100 text-xs font-medium text-amber-800"
              >
                Due today
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{recurrenceLabel(task)}</span>
            {task.lastCompletedAt ? (
              <span className="text-xs text-muted-foreground">
                Last: {formatDistanceToNow(task.lastCompletedAt)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Never done</span>
            )}
          </div>
        </div>

        <div className="mr-2 flex-shrink-0 text-right">
          {task.nextDueAt ? (
            <div
              className={cn(
                "text-xs font-medium",
                isOverdue && "text-destructive",
                isDueToday && !isOverdue && "text-amber-600",
                !isOverdue && !isDueToday && "text-muted-foreground"
              )}
            >
              {isOverdue
                ? formatDistanceToNow(task.nextDueAt) + " ago"
                : "in " + formatDistanceToNow(task.nextDueAt)}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="group h-8 w-8 flex-shrink-0 rounded-full hover:border-primary hover:bg-primary hover:text-primary-foreground"
          title="Mark complete"
          onClick={async (e) => {
            e.stopPropagation();
            await markComplete({ taskId: task._id });
          }}
        >
          <Check className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

function recurrenceLabel(task: TaskWithMeta): string {
  switch (task.recurrenceType) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Every month";
    case "custom": {
      const n = task.recurrenceInterval ?? 1;
      const unit = task.recurrenceUnit ?? "days";
      const label = n === 1 ? unit.replace(/s$/, "") : unit;
      return `Every ${n} ${label}`;
    }
    default:
      return "";
  }
}
