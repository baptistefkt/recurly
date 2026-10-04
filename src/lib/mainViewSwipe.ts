import type { MainView } from "./lastMainView";

/** Matches the app's `sm` breakpoint: swipe only below 640px. */
export const MAIN_VIEW_SWIPE_MAX_WIDTH_PX = 639;

export const MAIN_VIEW_SWIPE_MEDIA_QUERY = `(max-width: ${MAIN_VIEW_SWIPE_MAX_WIDTH_PX}px)`;

/** Ignore movement this small so a tap or jitter cannot pick an axis. */
export const SWIPE_AXIS_SLOP_PX = 18;

/**
 * Finger travel required before a horizontal gesture changes the main view.
 * Short drags stay on the current view.
 */
export const SWIPE_DISTANCE_PX = 64;

/**
 * Horizontal travel must exceed vertical travel by this factor.
 * A mostly vertical scroll, including a diagonal one, does not qualify.
 */
export const SWIPE_HORIZONTAL_DOMINANCE = 1.5;

export type SwipeAxis = "pending" | "horizontal" | "vertical";

export function mainViewFromLocation(location: string): MainView | null {
  if (location === "/") return "tasks";
  if (location === "/lists") return "lists";
  return null;
}

/**
 * Classify the gesture from its current deltas.
 * Vertical wins ties so a scroll with sideways drift is not a view change.
 */
export function classifySwipeAxis(dx: number, dy: number): SwipeAxis {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < SWIPE_AXIS_SLOP_PX && ady < SWIPE_AXIS_SLOP_PX) return "pending";
  if (ady >= adx) return "vertical";
  if (adx > ady * SWIPE_HORIZONTAL_DOMINANCE) return "horizontal";
  return "pending";
}

/**
 * Vertical is sticky: once the gesture is a scroll, later sideways movement
 * cannot turn it into a view change. Horizontal stays provisional so a finger
 * that drifts into a scroll can still be rejected.
 */
export function reduceSwipeAxis(previous: SwipeAxis, dx: number, dy: number): SwipeAxis {
  if (previous === "vertical") return "vertical";
  const next = classifySwipeAxis(dx, dy);
  if (next === "vertical") return "vertical";
  return next;
}

/**
 * Tasks is the left page and Lists is the right page, matching the lists
 * header (a left-pointing control back to Tasks, then the Lists title).
 * Moving the finger left advances to Lists. Moving it right returns to Tasks.
 */
export function mainViewAfterHorizontalSwipe(
  current: MainView,
  dx: number,
): MainView | null {
  if (dx <= -SWIPE_DISTANCE_PX && current === "tasks") return "lists";
  if (dx >= SWIPE_DISTANCE_PX && current === "lists") return "tasks";
  return null;
}

export function mainViewAfterSwipeSample(
  current: MainView,
  axis: SwipeAxis,
  dx: number,
): MainView | null {
  if (axis !== "horizontal") return null;
  return mainViewAfterHorizontalSwipe(current, dx);
}
