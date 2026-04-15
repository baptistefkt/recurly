import type { Id } from "../convex/_generated/dataModel";
import type { TaskListFilter } from "./taskListFilter";

export type StatusFilter = "all" | "overdue" | "doneToday" | "archived";

export type TaskComposeState =
  | { mode: "new" }
  | { mode: "edit"; taskId: Id<"tasks"> }
  | null;

export type DashboardUrlState = {
  taskListFilter: TaskListFilter;
  statusFilter: StatusFilter;
  selectedTag: string | null;
  detailTaskId: Id<"tasks"> | null;
  compose: TaskComposeState;
  hasScopeOverride: boolean;
};

type DashboardUrlWriteState = {
  taskListFilter: TaskListFilter;
  statusFilter: StatusFilter;
  selectedTag: string | null;
  detailTaskId: Id<"tasks"> | null;
  showModal: boolean;
  editTaskId: Id<"tasks"> | null;
};

const VALID_STATUSES: ReadonlySet<StatusFilter> = new Set([
  "all",
  "overdue",
  "doneToday",
  "archived",
]);

function parseSearch(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export function parseDashboardUrlState(search: string): DashboardUrlState {
  const params = parseSearch(search);
  const scope = params.get("scope");
  const teamId = params.get("teamId")?.trim();

  const hasScopeOverride = scope === "all" || scope === "personal" || scope === "team";

  const taskListFilter: TaskListFilter =
    scope === "all"
      ? { type: "all" }
      : scope === "team" && teamId
        ? { type: "team", teamId: teamId as Id<"teams"> }
        : { type: "personal" };

  const rawStatus = params.get("status");
  const statusFilter =
    rawStatus && VALID_STATUSES.has(rawStatus as StatusFilter)
      ? (rawStatus as StatusFilter)
      : "all";

  const rawTag = params.get("tag")?.trim();
  const selectedTag = rawTag ? rawTag : null;

  const composeMode = params.get("compose");
  const rawEditTaskId = params.get("editTaskId")?.trim();

  let compose: TaskComposeState = null;
  if (composeMode === "new") {
    compose = { mode: "new" };
  } else if (composeMode === "edit" && rawEditTaskId) {
    compose = { mode: "edit", taskId: rawEditTaskId as Id<"tasks"> };
  }

  const rawDetailTaskId = params.get("task")?.trim();
  const detailTaskId =
    compose === null && rawDetailTaskId ? (rawDetailTaskId as Id<"tasks">) : null;

  return {
    taskListFilter,
    statusFilter,
    selectedTag,
    detailTaskId,
    compose,
    hasScopeOverride,
  };
}

export function serializeDashboardUrlState(state: DashboardUrlWriteState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.taskListFilter.type === "all") {
    params.set("scope", "all");
  } else if (state.taskListFilter.type === "team") {
    params.set("scope", "team");
    params.set("teamId", state.taskListFilter.teamId);
  } else {
    params.set("scope", "personal");
  }

  if (state.statusFilter !== "all") {
    params.set("status", state.statusFilter);
  }

  const tag = state.selectedTag?.trim();
  if (tag) {
    params.set("tag", tag);
  }

  if (state.showModal) {
    if (state.editTaskId) {
      params.set("compose", "edit");
      params.set("editTaskId", state.editTaskId);
    } else {
      params.set("compose", "new");
    }
    return params;
  }

  if (state.detailTaskId) {
    params.set("task", state.detailTaskId);
  }

  return params;
}
