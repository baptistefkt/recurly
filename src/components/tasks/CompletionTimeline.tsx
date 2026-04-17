import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Completion = {
  _id: Id<"completions">;
  completedAt: number;
  note?: string;
  completerDisplayName?: string;
};

export function CompletionTimeline({
  completions,
  taskId: _taskId,
  showHeading = true,
}: {
  completions: Completion[];
  taskId: Id<"tasks">;
  showHeading?: boolean;
}) {
  const deleteCompletion = useMutation(api.completions.deleteCompletion);

  return (
    <div>
      {showHeading && (
        <h3 className="mb-3 text-sm font-medium text-foreground">
          History{" "}
          {completions.length > 0 && (
            <span className="font-normal text-muted-foreground">({completions.length})</span>
          )}
        </h3>
      )}
      {completions.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No completions yet</p>
      ) : (
        <div className="relative">
          <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
          <div className="flex flex-col gap-3">
            {completions.map((c, i) => (
              <div key={c._id} className="flex items-start gap-3 pl-0">
                <div
                  className={cn(
                    "z-10 mt-[6px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    i === 0 ? "bg-primary" : "bg-muted"
                  )}
                >
                  <Check
                    className={cn(
                      "h-3 w-3",
                      i === 0 ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                    strokeWidth={2.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {formatDate(c.completedAt)}
                      {c.completerDisplayName ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {c.completerDisplayName}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Remove completion"
                      onClick={async () => {
                        try {
                          await deleteCompletion({ completionId: c._id });
                          toast.success("Removed");
                        } catch {
                          toast.error("Failed to remove");
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {c.note && <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today, " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday, " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days < 7)
    return d.toLocaleDateString([], { weekday: "long" }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
