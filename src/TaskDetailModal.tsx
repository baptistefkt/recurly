import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { CompletionTimeline } from "./CompletionTimeline";

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
  const completions = useQuery(api.completions.listForTask, { taskId, limit: 20 });
  const markComplete = useMutation(api.completions.markComplete);
  const archiveTask = useMutation(api.tasks.archive);
  const unarchiveTask = useMutation(api.tasks.unarchive);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg truncate pr-4">{task.title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {task.description && (
            <p className="text-gray-500 text-sm">{task.description}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await markComplete({ taskId });
                onClose();
              }}
              className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ✓ Mark Complete
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                if (task.isArchived) {
                  await unarchiveTask({ taskId });
                } else {
                  await archiveTask({ taskId });
                }
                onClose();
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {task.isArchived ? "Restore" : "Archive"}
            </button>
          </div>
          <CompletionTimeline completions={completions ?? []} taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
