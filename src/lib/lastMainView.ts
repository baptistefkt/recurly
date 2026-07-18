const STORAGE_KEY = "recurly:lastMainView";

export type MainView = "tasks" | "lists";

export function getLastMainView(): MainView {
  try {
    return localStorage.getItem(STORAGE_KEY) === "lists" ? "lists" : "tasks";
  } catch {
    return "tasks";
  }
}

export function setLastMainView(view: MainView): void {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function pathForMainView(view: MainView): string {
  return view === "lists" ? "/lists" : "/";
}

/** Intentional task entry points that must not be overridden by last-view restore. */
export function hasTasksDeepLink(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  return (
    params.has("task") ||
    params.has("compose") ||
    params.has("editTaskId")
  );
}
