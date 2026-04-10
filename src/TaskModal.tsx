import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

const COLORS = [
  { name: "gray", label: "Gray", cls: "bg-gray-400" },
  { name: "red", label: "Red", cls: "bg-red-400" },
  { name: "orange", label: "Orange", cls: "bg-orange-400" },
  { name: "yellow", label: "Yellow", cls: "bg-yellow-400" },
  { name: "green", label: "Green", cls: "bg-green-400" },
  { name: "blue", label: "Blue", cls: "bg-blue-400" },
  { name: "purple", label: "Purple", cls: "bg-purple-400" },
  { name: "pink", label: "Pink", cls: "bg-pink-400" },
];

type RecurrenceType = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
type RecurrenceUnit = "days" | "weeks" | "months";

export function TaskModal({
  taskId,
  onClose,
}: {
  taskId: Id<"tasks"> | null;
  onClose: () => void;
}) {
  const existingTask = useQuery(api.tasks.get, taskId ? { taskId } : "skip");
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("weeks");
  const [color, setColor] = useState("gray");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description ?? "");
      setRecurrenceType(existingTask.recurrenceType as RecurrenceType);
      setRecurrenceInterval(existingTask.recurrenceInterval ?? 1);
      setRecurrenceUnit((existingTask.recurrenceUnit as RecurrenceUnit) ?? "weeks");
      setColor(existingTask.color ?? "gray");
    }
  }, [existingTask]);

  const isEdit = !!taskId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const customFields = recurrenceType === "custom"
        ? { recurrenceInterval, recurrenceUnit }
        : { recurrenceInterval: undefined, recurrenceUnit: undefined };
      if (isEdit && taskId) {
        await updateTask({ taskId, title: title.trim(), description: description.trim() || undefined, recurrenceType, color, ...customFields });
        toast.success("Task updated");
      } else {
        await createTask({ title: title.trim(), description: description.trim() || undefined, recurrenceType, color, ...customFields });
        toast.success("Task created");
      }
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!taskId) return;
    setSaving(true);
    try {
      await removeTask({ taskId });
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task name</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean the bathroom"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any extra details..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repeats</label>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekly", "biweekly", "monthly", "custom"] as RecurrenceType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrenceType(r)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    recurrenceType === r
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {r === "biweekly" ? "2 weeks" : r === "custom" ? "Custom" : r}
                </button>
              ))}
            </div>
            {recurrenceType === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600 flex-shrink-0">Every</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-center"
                />
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm flex-1">
                  {(["days", "weeks", "months"] as RecurrenceUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setRecurrenceUnit(u)}
                      className={`flex-1 py-2 font-medium transition-colors ${
                        recurrenceUnit === u
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-7 h-7 rounded-full ${c.cls} transition-transform ${
                    color === c.name ? "ring-2 ring-offset-2 ring-gray-900 scale-110" : "hover:scale-105"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
            {isEdit && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            {isEdit && confirmDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
