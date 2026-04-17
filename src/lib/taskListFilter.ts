import type { Id } from "../../convex/_generated/dataModel";

export type TaskListFilter =
  | { type: "personal" }
  | { type: "all" }
  | { type: "team"; teamId: Id<"teams"> };

const TEAM_TAB_PREFIX = "team:" as const;

export function filterToViewTabValue(filter: TaskListFilter): string {
  if (filter.type === "all") return "all";
  if (filter.type === "personal") return "personal";
  return `${TEAM_TAB_PREFIX}${filter.teamId}`;
}

export function viewTabValueToFilter(value: string): TaskListFilter {
  if (value === "all") return { type: "all" };
  if (value === "personal") return { type: "personal" };
  if (value.startsWith(TEAM_TAB_PREFIX)) {
    return {
      type: "team",
      teamId: value.slice(TEAM_TAB_PREFIX.length) as Id<"teams">,
    };
  }
  return { type: "personal" };
}

export function listQueryArgs(
  filter: TaskListFilter,
  includeArchived: boolean,
  tagFilter?: string | null
) {
  const base =
    filter.type === "personal"
      ? { includeArchived, listMode: "personal" as const }
      : filter.type === "all"
        ? { includeArchived, listMode: "all" as const }
        : {
            includeArchived,
            listMode: "team" as const,
            teamId: filter.teamId,
          };
  const tag = tagFilter?.trim();
  return tag ? { ...base, tagFilter: tag } : base;
}

export function taskModalContext(filter: TaskListFilter): {
  listMode: "personal" | "team";
  activeTeamId: Id<"teams"> | null;
} {
  if (filter.type === "team") {
    return { listMode: "team", activeTeamId: filter.teamId };
  }
  return { listMode: "personal", activeTeamId: null };
}

export function taskListFilterToMutationView(
  filter: TaskListFilter
): "personal" | "all" | { teamId: Id<"teams"> } {
  if (filter.type === "personal") return "personal";
  if (filter.type === "all") return "all";
  return { teamId: filter.teamId };
}
