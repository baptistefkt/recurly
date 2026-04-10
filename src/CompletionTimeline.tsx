import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

type Completion = {
  _id: Id<"completions">;
  completedAt: number;
  note?: string;
};

export function CompletionTimeline({
  completions,
  taskId,
}: {
  completions: Completion[];
  taskId: Id<"tasks">;
}) {
  const deleteCompletion = useMutation(api.completions.deleteCompletion);

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        History {completions.length > 0 && <span className="text-gray-400 font-normal">({completions.length})</span>}
      </h3>
      {completions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No completions yet</p>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
          <div className="flex flex-col gap-3">
            {completions.map((c, i) => (
              <div key={c._id} className="flex items-start gap-3 pl-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  i === 0 ? "bg-gray-900" : "bg-gray-200"
                }`}>
                  <svg className={`w-3 h-3 ${i === 0 ? "text-white" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700">{formatDate(c.completedAt)}</span>
                    <button
                      onClick={async () => {
                        try {
                          await deleteCompletion({ completionId: c._id });
                          toast.success("Removed");
                        } catch {
                          toast.error("Failed to remove");
                        }
                      }}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Remove completion"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {c.note && <p className="text-xs text-gray-400 mt-0.5">{c.note}</p>}
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
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
