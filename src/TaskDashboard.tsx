import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { SignOutButton } from "./SignOutButton";
import { Id } from "../convex/_generated/dataModel";
import { DUE_GROUP_LABEL, groupTasksByDueGroup } from "./dueGroups";

type Tab = "upcoming" | "all" | "archived";

export function TaskDashboard() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<Id<"tasks"> | null>(null);

  const tasks = useQuery(api.tasks.list, { includeArchived: tab === "archived" });
  const user = useQuery(api.auth.loggedInUser);

  const now = Date.now();

  const displayedTasks = (() => {
    if (!tasks) return [];
    if (tab === "archived") return tasks.filter((t) => t.isArchived);
    const active = tasks.filter((t) => !t.isArchived);
    return [...active].sort((a, b) => {
      const aNext = a.nextDueAt ?? Infinity;
      const bNext = b.nextDueAt ?? Infinity;
      return aNext - bNext;
    });
  })();

  const overdueCount = tasks?.filter(
    (t) => !t.isArchived && t.nextDueAt !== null && t.nextDueAt < now
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Recurly</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4 flex-1">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Tasks" value={tasks?.filter(t => !t.isArchived).length ?? 0} />
          <StatCard label="Overdue" value={overdueCount} highlight={overdueCount > 0} />
          <StatCard label="Done Today" value={tasks?.filter(t => {
            if (!t.lastCompletedAt) return false;
            const d = new Date(t.lastCompletedAt);
            const today = new Date();
            return d.toDateString() === today.toDateString();
          }).length ?? 0} />
        </div>

        {/* Tabs + Add button */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["upcoming", "all", "archived"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditTaskId(null); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Task list */}
        {tasks === undefined ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : displayedTasks.length === 0 ? (
          <EmptyState tab={tab} onAdd={() => { setEditTaskId(null); setShowModal(true); }} />
        ) : tab === "archived" ? (
          <div className="flex flex-col gap-2">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={() => { setEditTaskId(task._id); setShowModal(true); }}
                onDetail={() => setDetailTaskId(task._id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupTasksByDueGroup(displayedTasks, now).map(({ group, tasks: sectionTasks }) => (
              <section key={group} className="flex flex-col gap-2">
                <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/90 supports-[backdrop-filter]:bg-gray-50/85">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {DUE_GROUP_LABEL[group]}
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {sectionTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onEdit={() => { setEditTaskId(task._id); setShowModal(true); }}
                      onDetail={() => setDetailTaskId(task._id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <TaskModal
          taskId={editTaskId}
          onClose={() => { setShowModal(false); setEditTaskId(null); }}
        />
      )}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onEdit={() => { setEditTaskId(detailTaskId); setDetailTaskId(null); setShowModal(true); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-3 text-center ${highlight ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-gray-900 font-medium">
        {tab === "archived" ? "No archived tasks" : "No tasks yet"}
      </p>
      <p className="text-gray-500 text-sm mt-1">
        {tab === "archived" ? "Archived tasks will appear here" : "Add your first recurring task to get started"}
      </p>
      {tab !== "archived" && (
        <button
          onClick={onAdd}
          className="mt-4 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Add Task
        </button>
      )}
    </div>
  );
}
