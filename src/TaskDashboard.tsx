import { useState } from "react";
import { useQuery } from "convex/react";
import { ClipboardList, Plus } from "lucide-react";
import { api } from "../convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { SignOutButton } from "./SignOutButton";
import { TeamBar } from "./TeamBar";
import { PendingInvitesBanner } from "./PendingInvitesBanner";
import { Id } from "../convex/_generated/dataModel";
import { DUE_GROUP_LABEL, groupTasksByDueGroup } from "./dueGroups";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Tab = "upcoming" | "all" | "archived";

export function TaskDashboard() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<Id<"tasks"> | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);

  const tasks = useQuery(api.tasks.list, {
    includeArchived: tab === "archived",
    listMode: selectedTeamId === null ? "personal" : "team",
    teamId: selectedTeamId ?? undefined,
  });
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

  const overdueCount =
    tasks?.filter((t) => !t.isArchived && t.nextDueAt !== null && t.nextDueAt < now).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Recurly</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
        <PendingInvitesBanner />
        <TeamBar selectedTeamId={selectedTeamId} onSelectTeam={setSelectedTeamId} />
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
            <TabsList className="h-auto w-full justify-start sm:w-auto">
              {(["upcoming", "all", "archived"] as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            className="shrink-0"
            onClick={() => {
              setEditTaskId(null);
              setShowModal(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
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
          listMode={selectedTeamId === null ? "personal" : "team"}
          activeTeamId={selectedTeamId}
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
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card
      className={cn(
        "text-center shadow-none",
        highlight && "border-destructive/40 bg-destructive/5"
      )}
    >
      <CardContent className="p-3 pt-3">
        <div
          className={cn(
            "text-2xl font-bold",
            highlight ? "text-destructive" : "text-foreground"
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">
        {tab === "archived" ? "No archived tasks" : "No tasks yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {tab === "archived"
          ? "Archived tasks will appear here"
          : "Add your first recurring task to get started"}
      </p>
      {tab !== "archived" && (
        <Button className="mt-4" onClick={onAdd}>
          Add Task
        </Button>
      )}
    </div>
  );
}
