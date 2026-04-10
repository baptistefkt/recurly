import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { formatDistanceToNow } from "./dateUtils";

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
  onEdit,
  onDetail,
}: {
  task: TaskWithMeta;
  onEdit: () => void;
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
    <div
      className={`bg-white rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
        isOverdue ? "border-red-200" : "border-gray-200"
      }`}
      onClick={onDetail}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorDot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{task.title}</span>
            {isOverdue && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                Overdue
              </span>
            )}
            {isDueToday && !isOverdue && (
              <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                Due today
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400">{recurrenceLabel(task)}</span>
            {task.lastCompletedAt ? (
              <span className="text-xs text-gray-400">
                Last: {formatDistanceToNow(task.lastCompletedAt)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Never done</span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0 mr-2">
          {task.nextDueAt ? (
            <div
              className={`text-xs font-medium ${
                isOverdue ? "text-red-500" : isDueToday ? "text-amber-500" : "text-gray-400"
              }`}
            >
              {isOverdue
                ? formatDistanceToNow(task.nextDueAt) + " ago"
                : "in " + formatDistanceToNow(task.nextDueAt)}
            </div>
          ) : null}
        </div>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            await markComplete({ taskId: task._id });
          }}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all group flex-shrink-0"
          title="Mark complete"
        >
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function recurrenceLabel(task: TaskWithMeta): string {
  switch (task.recurrenceType) {
    case "daily": return "Every day";
    case "weekly": return "Every week";
    case "biweekly": return "Every 2 weeks";
    case "monthly": return "Every month";
    case "custom": {
      const n = task.recurrenceInterval ?? 1;
      const unit = task.recurrenceUnit ?? "days";
      const label = n === 1 ? unit.replace(/s$/, "") : unit;
      return `Every ${n} ${label}`;
    }
    default: return "";
  }
}
