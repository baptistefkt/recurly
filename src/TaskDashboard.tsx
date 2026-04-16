import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import autoAnimate from "@formkit/auto-animate";
import { ClipboardList, Plus } from "lucide-react";
import { useLocation, useSearch } from "wouter";
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
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ReminderSettingsModal } from "./ReminderSettingsModal";
import {
  parseDashboardUrlState,
  serializeDashboardUrlState,
  type StatusFilter,
} from "./urlState";

function isTaskOverdue(task: { nextDueAt: number | null }, nowMs: number): boolean {
  return task.nextDueAt !== null && task.nextDueAt < nowMs;
}

function taskListFiltersEqual(a: TaskListFilter, b: TaskListFilter): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "team" && b.type === "team") return a.teamId === b.teamId;
  return true;
}

export function TaskDashboard() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const initialUrlState = useMemo(
    () =>
      parseDashboardUrlState(
        typeof window !== "undefined" ? window.location.search : ""
      ),
    []
  );
  const skipNextUrlWriteRef = useRef(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialUrlState.statusFilter
  );
  const [showModal, setShowModal] = useState(initialUrlState.compose !== null);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(
    initialUrlState.compose?.mode === "edit" ? initialUrlState.compose.taskId : null
  );
  const [detailTaskId, setDetailTaskId] = useState<Id<"tasks"> | null>(
    initialUrlState.detailTaskId
  );
  const [taskListFilter, setTaskListFilter] = useState<TaskListFilter>(
    initialUrlState.taskListFilter
  );
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(
    initialUrlState.selectedTag
  );
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  usePushNotifications();
  const animatedListsRef = useRef<WeakSet<HTMLElement>>(new WeakSet());

  const tagLabels = useQuery(api.tasks.distinctTags, {});
  const tasks = useQuery(
    api.tasks.list,
    listQueryArgs(taskListFilter, true, selectedTag)
  );
  const user = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    const parsed = parseDashboardUrlState(search);
    const parsedShowModal = parsed.compose !== null;
    const parsedEditTaskId =
      parsed.compose?.mode === "edit" ? parsed.compose.taskId : null;

    let changed = false;
    if (!taskListFiltersEqual(taskListFilter, parsed.taskListFilter)) {
      setTaskListFilter(parsed.taskListFilter);
      changed = true;
    }
    if (statusFilter !== parsed.statusFilter) {
      setStatusFilter(parsed.statusFilter);
      changed = true;
    }
    if (selectedTag !== parsed.selectedTag) {
      setSelectedTag(parsed.selectedTag);
      changed = true;
    }
    if (showModal !== parsedShowModal) {
      setShowModal(parsedShowModal);
      changed = true;
    }
    if (editTaskId !== parsedEditTaskId) {
      setEditTaskId(parsedEditTaskId);
      changed = true;
    }
    if (detailTaskId !== parsed.detailTaskId) {
      setDetailTaskId(parsed.detailTaskId);
      changed = true;
    }

    if (changed) {
      skipNextUrlWriteRef.current = true;
    }
  }, [search]);

  useEffect(() => {
    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false;
      return;
    }
    const nextParams = serializeDashboardUrlState({
      taskListFilter,
      statusFilter,
      selectedTag,
      detailTaskId,
      showModal,
      editTaskId,
    });
    const nextQuery = nextParams.toString();
    const currentQuery = search.startsWith("?") ? search.slice(1) : search;
    if (nextQuery === currentQuery) return;

    const nextUrl = nextQuery ? `${location}?${nextQuery}` : location;
    navigate(nextUrl);
  }, [
    detailTaskId,
    editTaskId,
    location,
    navigate,
    search,
    selectedTag,
    showModal,
    statusFilter,
    taskListFilter,
  ]);

  const now = Date.now();
  const isDoneToday = (ts: number | null | undefined) => {
    if (!ts) return false;
    const d = new Date(ts);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const displayedTasks = (() => {
    if (!tasks) return [];
    const archived = tasks.filter((t) => t.isArchived);
    const active = tasks.filter((t) => !t.isArchived);
    if (statusFilter === "archived") return archived;
    const filtered =
      statusFilter === "overdue"
        ? active.filter((t) => isTaskOverdue(t, now))
        : statusFilter === "doneToday"
          ? active.filter((t) => isDoneToday(t.lastCompletedAt))
          : active;
    return [...filtered].sort((a, b) => {
      const aNext = a.nextDueAt ?? Infinity;
      const bNext = b.nextDueAt ?? Infinity;
      return aNext - bNext;
    });
  })();
  const groupedDueSections = groupTasksByDueGroup(displayedTasks, now);
  const showDueTimeline = groupedDueSections.length > 1;

  const activeTaskCount = tasks?.filter((t) => !t.isArchived).length ?? 0;
  const overdueCount =
    tasks?.filter((t) => !t.isArchived && t.nextDueAt !== null && t.nextDueAt < now).length ?? 0;
  const doneTodayCount =
    tasks?.filter((t) => !t.isArchived && isDoneToday(t.lastCompletedAt)).length ?? 0;
  const archivedCount = tasks?.filter((t) => t.isArchived).length ?? 0;
  const attachListAnimation = (element: HTMLElement | null) => {
    if (!element || animatedListsRef.current.has(element)) return;
    autoAnimate(element, { duration: 240, easing: "ease-out" });
    animatedListsRef.current.add(element);
  };

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
              setDetailTaskId(null);
              setShowModal(true);
            }}
            onNewTeam={() => setCreateTeamOpen(true)}
            onReminderSettings={() => setShowReminderSettings(true)}
            onOpenStats={() => {
              const dashboardQuery = search
                ? search.startsWith("?")
                  ? search
                  : `?${search}`
                : "";
              navigate(`/stats${dashboardQuery}`);
            }}
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
          hasInitialScopeOverride={initialUrlState.hasScopeOverride}
          createTeamOpen={createTeamOpen}
          onCreateTeamOpenChange={setCreateTeamOpen}
        />
        <div className="overflow-hidden rounded-2xl bg-background/80">
          <div className="grid grid-cols-4 divide-x divide-border/70">
            <StatColumn
              label="Total Tasks"
              value={activeTaskCount}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatColumn
              label="Overdue"
              value={overdueCount}
              valueClassName={overdueCount > 0 ? "text-destructive" : undefined}
              active={statusFilter === "overdue"}
              onClick={() => setStatusFilter("overdue")}
            />
            <StatColumn
              label="Done Today"
              value={doneTodayCount}
              active={statusFilter === "doneToday"}
              onClick={() => setStatusFilter("doneToday")}
            />
            <StatColumn
              label="Archived"
              value={archivedCount}
              active={statusFilter === "archived"}
              onClick={() => setStatusFilter("archived")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {tagLabels !== undefined && tagLabels.length > 0 ? (
            <div className="min-w-0">
              <div className="-mx-1 flex items-center gap-1 overflow-x-auto pb-1">
                <span className="shrink-0 px-1 text-xs font-medium text-muted-foreground">
                  Filter by tags:
                </span>
                <Button
                  type="button"
                  variant={selectedTag === null ? "default" : "outline"}
                  size="xs"
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Button>
                {tagLabels.map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant={selectedTag === label ? "default" : "outline"}
                    size="xs"
                    onClick={() =>
                      setSelectedTag((prev) => (prev === label ? null : label))
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div />
          )}
          <Button
            onClick={() => {
              setEditTaskId(null);
              setDetailTaskId(null);
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
          <EmptyState
            filter={statusFilter}
            onAdd={() => {
              setEditTaskId(null);
              setDetailTaskId(null);
              setShowModal(true);
            }}
          />
        ) : statusFilter === "archived" ? (
          <div ref={attachListAnimation} className="flex flex-col gap-2">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onDetail={() => {
                  setShowModal(false);
                  setEditTaskId(null);
                  setDetailTaskId(task._id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedDueSections.map(({ group, tasks: sectionTasks }, index) => (
              <section
                key={group}
                className={cn("flex flex-col gap-2", showDueTimeline && "relative pl-6")}
              >
                {showDueTimeline && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-[3.5px] top-[10px] z-20 h-3 w-3 rounded-full border-2 border-muted-foreground bg-muted"
                    />
                    {index < groupedDueSections.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[9px] top-[10px] -bottom-10 w-px bg-border"
                      />
                    )}
                  </>
                )}
                <div className="sticky top-14 z-10 -mx-4 px-4 py-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {DUE_GROUP_LABEL[group]}
                  </h3>
                </div>
                <div ref={attachListAnimation} className="flex flex-col gap-2">
                  {sectionTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onDetail={() => {
                        setShowModal(false);
                        setEditTaskId(null);
                        setDetailTaskId(task._id);
                      }}
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

function StatColumn({
  label,
  value,
  valueClassName,
  active,
  onClick,
}: {
  label: string;
  value: number;
  valueClassName?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer px-3 py-2.5 text-center transition-colors sm:px-4",
        active ? "bg-muted dark:bg-muted/60" : "hover:bg-muted/25"
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", valueClassName)}>
        {value}
      </p>
    </button>
  );
}
 

function EmptyState({ filter, onAdd }: { filter: StatusFilter; onAdd: () => void }) {
  const title =
    filter === "archived"
      ? "No archived tasks"
      : filter === "overdue"
        ? "No overdue tasks"
        : filter === "doneToday"
          ? "Nothing done today yet"
        : "No tasks yet";
  const subtitle =
    filter === "archived"
      ? "Archived tasks will appear here"
      : filter === "overdue"
        ? "Great job staying on top of your tasks."
        : filter === "doneToday"
          ? "Complete a task and it will appear here."
        : "Add your first recurring task to get started";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      {filter !== "archived" && (
        <div className="mt-4">
          <Button onClick={onAdd}>Add Task</Button>
        </div>
      )}
    </div>
  );
}
