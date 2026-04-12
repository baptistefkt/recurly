import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { CompletionTimeline } from "./CompletionTimeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const teamMembers = useQuery(
    api.teams.members,
    task?.visibility === "team" && task.teamId ? { teamId: task.teamId } : "skip"
  );
  const markComplete = useMutation(api.completions.markComplete);
  const archiveTask = useMutation(api.tasks.archive);
  const unarchiveTask = useMutation(api.tasks.unarchive);

  if (!task) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-0 border-b px-5 pb-3 pt-5 text-left">
          <DialogTitle className="truncate pr-8">{task.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[min(60vh,32rem)] flex-1 px-5 py-4">
          <div className="flex flex-col gap-4 pr-3">
            {task.visibility === "team" && (
              <p className="text-xs font-medium text-indigo-600">Shared with the team</p>
            )}
            {task.assigneeUserIds &&
              task.assigneeUserIds.length > 0 &&
              teamMembers && (
                <p className="text-sm text-muted-foreground">
                  <span className="text-muted-foreground/80">Assigned: </span>
                  {task.assigneeUserIds
                    .map((id) => {
                      const m = teamMembers.find((x) => x.userId === id);
                      return m?.name || m?.email || "Member";
                    })
                    .join(", ")}
                </p>
              )}
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="flex-1 min-w-[8rem]"
                onClick={async () => {
                  await markComplete({ taskId });
                  onClose();
                }}
              >
                ✓ Mark Complete
              </Button>
              <Button type="button" variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-muted-foreground"
                onClick={async () => {
                  if (task.isArchived) {
                    await unarchiveTask({ taskId });
                  } else {
                    await archiveTask({ taskId });
                  }
                  onClose();
                }}
              >
                {task.isArchived ? "Restore" : "Archive"}
              </Button>
            </div>
            <CompletionTimeline completions={completions ?? []} taskId={taskId} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
