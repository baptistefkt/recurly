import { useState } from "react";
import { useQuery } from "convex/react";
import { ClipboardList, Plus } from "lucide-react";
import { api } from "../convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { TeamBar } from "./TeamBar";
import { UserMenu } from "./UserMenu";
import { PendingInvitesBanner } from "./PendingInvitesBanner";
import { Id } from "../convex/_generated/dataModel";
import { DUE_GROUP_LABEL, groupTasksByDueGroup } from "./dueGroups";
import {
  listQueryArgs,
  taskModalContext,
  type TaskListFilter,
} from "./taskListFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ReminderSettingsModal } from "./ReminderSettingsModal";

type Tab = "all" | "upcoming" | "archived";

function isTaskOverdue(task: { nextDueAt: number | null }, nowMs: number): boolean {
  return task.nextDueAt !== null && task.nextDueAt < nowMs;
}

export function TaskDashboard() {
  const [tab, setTab] = useState<Tab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<Id<"tasks"> | null>(null);
  const [taskListFilter, setTaskListFilter] = useState<TaskListFilter>({
    type: "personal",
  });
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  usePushNotifications();

  const tagLabels = useQuery(api.tasks.distinctTags, {});
  const tasks = useQuery(
    api.tasks.list,
    listQueryArgs(taskListFilter, tab === "archived", selectedTag)
  );
  const user = useQuery(api.auth.loggedInUser);

  const now = Date.now();

  const displayedTasks = (() => {
    if (!tasks) return [];
    if (tab === "archived") return tasks.filter((t) => t.isArchived);
    const active = tasks.filter((t) => !t.isArchived);
    const filtered =
      tab === "upcoming" ? active.filter((t) => !isTaskOverdue(t, now)) : active;
    return [...filtered].sort((a, b) => {
      const aNext = a.nextDueAt ?? Infinity;
      const bNext = b.nextDueAt ?? Infinity;
      return aNext - bNext;
    });
  })();

  const overdueCount =
    tasks?.filter((t) => !t.isArchived && t.nextDueAt !== null && t.nextDueAt < now).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img
              src="/icon-192.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-lg object-cover"
            />
            <span className="font-semibold text-foreground">Recurly</span>
          </div>
          <UserMenu
            user={user ?? undefined}
            onAddTask={() => {
              setEditTaskId(null);
              setShowModal(true);
            }}
            onNewTeam={() => setCreateTeamOpen(true)}
            onReminderSettings={() => setShowReminderSettings(true)}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
        <PendingInvitesBanner />
        <TeamBar
          filter={taskListFilter}
          onFilterChange={(next) => {
            setTaskListFilter(next);
            setSelectedTag(null);
          }}
          createTeamOpen={createTeamOpen}
          onCreateTeamOpenChange={setCreateTeamOpen}
        />
        {tagLabels !== undefined && tagLabels.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Filter by tag
            </p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
              <Button
                type="button"
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {tagLabels.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant={selectedTag === label ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSelectedTag((prev) => (prev === label ? null : label))
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Total Tasks"
            value={tasks?.filter((t) => !t.isArchived).length ?? 0}
          />
          <StatCard label="Overdue" value={overdueCount} highlight={overdueCount > 0} />
          <StatCard
            label="Done Today"
            value={
              tasks?.filter((t) => {
                if (!t.lastCompletedAt) return false;
                const d = new Date(t.lastCompletedAt);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length ?? 0
            }
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              {(["all", "upcoming", "archived"] as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            onClick={() => {
              setEditTaskId(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {tasks === undefined ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : displayedTasks.length === 0 ? (
          <EmptyState tab={tab} onAdd={() => { setEditTaskId(null); setShowModal(true); }} />
        ) : tab === "archived" ? (
          <div className="flex flex-col gap-2">
            {displayedTasks.map((task) => (
              <TaskCard key={task._id} task={task} onDetail={() => setDetailTaskId(task._id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupTasksByDueGroup(displayedTasks, now).map(({ group, tasks: sectionTasks }) => (
              <section key={group} className="flex flex-col gap-2">
                <div className="sticky top-14 z-10 -mx-4 border-b border-border/80 bg-muted/80 px-4 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/70">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {DUE_GROUP_LABEL[group]}
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {sectionTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onDetail={() => setDetailTaskId(task._id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          taskId={editTaskId}
          onClose={() => {
            setShowModal(false);
            setEditTaskId(null);
          }}
          {...taskModalContext(taskListFilter)}
        />
      )}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onEdit={() => {
            setEditTaskId(detailTaskId);
            setDetailTaskId(null);
            setShowModal(true);
          }}
        />
      )}
      <ReminderSettingsModal
        open={showReminderSettings}
        onOpenChange={setShowReminderSettings}
      />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <Card>
        <CardContent>
          <div
            className={cn("text-2xl font-bold", highlight && "text-destructive")}
          >
            {value}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  const title =
    tab === "archived"
      ? "No archived tasks"
      : tab === "upcoming"
        ? "Nothing upcoming"
        : "No tasks yet";
  const subtitle =
    tab === "archived"
      ? "Archived tasks will appear here"
      : tab === "upcoming"
        ? "You have no on-time tasks due ahead. Open All to see overdue items."
        : "Add your first recurring task to get started";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      {tab !== "archived" && (
        <div className="mt-4">
          <Button onClick={onAdd}>Add Task</Button>
        </div>
      )}
    </div>
  );
}
