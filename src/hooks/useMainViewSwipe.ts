import { useEffect, useRef } from "react";
import { pathForMainView } from "@/lib/lastMainView";
import {
  MAIN_VIEW_SWIPE_MEDIA_QUERY,
  mainViewAfterSwipeSample,
  mainViewFromLocation,
  reduceSwipeAxis,
  type SwipeAxis,
} from "@/lib/mainViewSwipe";

const OPEN_OVERLAY_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="dialog-overlay"]',
  '[data-slot="sheet-content"]',
  '[data-slot="sheet-overlay"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="alert-dialog-overlay"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(",");

const HORIZONTAL_CONTROL_SELECTOR = [
  "[data-main-view-swipe-ignore]",
  '[aria-roledescription="sortable"]',
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
].join(",");

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: SwipeAxis;
  ignored: boolean;
  claimed: boolean;
};

function eventElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isBlockingOverlayOpen(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

function elementHandlesHorizontalGesture(target: EventTarget | null): boolean {
  const element = eventElement(target);
  if (!element) return true;
  if (element.closest(HORIZONTAL_CONTROL_SELECTOR)) return true;

  let node: Element | null = element;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const touchAction = style.touchAction;
      if (
        touchAction === "none" ||
        (touchAction.includes("pan-x") && !touchAction.includes("pan-y"))
      ) {
        return true;
      }
      const overflowX = style.overflowX;
      if (
        (overflowX === "auto" || overflowX === "scroll") &&
        node.scrollWidth > node.clientWidth + 1
      ) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

function shouldIgnoreSwipe(target: EventTarget | null): boolean {
  if (isBlockingOverlayOpen()) return true;
  return elementHandlesHorizontalGesture(target);
}

/**
 * On a narrow viewport, a deliberate horizontal swipe moves between the tasks
 * and lists main views through the same navigation used by the existing controls.
 * Wide layouts, vertical scrolling, open overlays, and in-view horizontal drags
 * are left alone.
 */
export function useMainViewSwipe(
  ready: boolean,
  location: string,
  navigate: (to: string) => void,
): void {
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  locationRef.current = location;
  navigateRef.current = navigate;
  const swipeEnabled = ready && mainViewFromLocation(location) !== null;

  useEffect(() => {
    if (!swipeEnabled || typeof window === "undefined") return;

    const media = window.matchMedia(MAIN_VIEW_SWIPE_MEDIA_QUERY);
    let gesture: Gesture | null = null;
    let suppressClick = false;
    let gestureController: AbortController | null = null;

    const resetGesture = () => {
      gesture = null;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!media.matches) return;
      if (!event.isPrimary) {
        if (gesture) gesture.ignored = true;
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (mainViewFromLocation(locationRef.current) === null) return;

      // A new press means the previous swipe's click already fired.
      suppressClick = false;
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: "pending",
        ignored: shouldIgnoreSwipe(event.target),
        claimed: false,
      };
    };

    const tryCommitSwipe = (dx: number) => {
      const active = gesture;
      if (!active || active.ignored || active.claimed) return;
      if (active.axis !== "horizontal") return;
      if (isBlockingOverlayOpen()) {
        active.ignored = true;
        return;
      }
      const current = mainViewFromLocation(locationRef.current);
      if (!current) return;
      const next = mainViewAfterSwipeSample(current, active.axis, dx);
      if (!next) return;

      active.claimed = true;
      suppressClick = true;
      window.getSelection()?.removeAllRanges();
      const path = pathForMainView(next);
      locationRef.current = path;
      navigateRef.current(path);
    };

    const onPointerMove = (event: PointerEvent) => {
      const active = gesture;
      if (!active || event.pointerId !== active.pointerId) return;
      if (active.ignored) return;
      if (active.claimed) {
        if (event.pointerType === "mouse" && event.cancelable) event.preventDefault();
        return;
      }

      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      active.axis = reduceSwipeAxis(active.axis, dx, dy);
      if (active.axis === "horizontal" && event.pointerType === "mouse" && event.cancelable) {
        event.preventDefault();
      }
      tryCommitSwipe(dx);
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      resetGesture();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture) return;
      const activeId = gesture.pointerId;
      const lifted = Array.from(event.changedTouches).some(
        (touch) => touch.identifier === activeId,
      );
      if (lifted || event.touches.length === 0) resetGesture();
    };

    const onTouchMove = (event: TouchEvent) => {
      const active = gesture;
      if (!active || active.ignored) return;
      if (!active.claimed) {
        const touch =
          Array.from(event.touches).find((item) => item.identifier === active.pointerId) ??
          event.touches[0];
        if (!touch) return;
        const dx = touch.clientX - active.startX;
        const dy = touch.clientY - active.startY;
        active.axis = reduceSwipeAxis(active.axis, dx, dy);
        tryCommitSwipe(dx);
      }
      if (
        !active.ignored &&
        (active.claimed || active.axis === "horizontal") &&
        event.cancelable
      ) {
        event.preventDefault();
      }
    };

    const attach = () => {
      gestureController?.abort();
      resetGesture();
      suppressClick = false;
      const controller = new AbortController();
      gestureController = controller;
      const { signal } = controller;
      window.addEventListener("pointerdown", onPointerDown, { capture: true, signal });
      window.addEventListener("pointermove", onPointerMove, { capture: true, signal });
      window.addEventListener("pointerup", onPointerEnd, { capture: true, signal });
      window.addEventListener("pointercancel", onPointerEnd, { capture: true, signal });
      window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true, signal });
      window.addEventListener("touchend", onTouchEnd, { capture: true, signal });
      window.addEventListener("touchcancel", onTouchEnd, { capture: true, signal });
      window.addEventListener("click", onClickCapture, { capture: true, signal });
    };

    const detach = () => {
      gestureController?.abort();
      gestureController = null;
      resetGesture();
      suppressClick = false;
    };

    const sync = () => {
      if (media.matches) attach();
      else detach();
    };

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      detach();
    };
  }, [swipeEnabled]);
}
