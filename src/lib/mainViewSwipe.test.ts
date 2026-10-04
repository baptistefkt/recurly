import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SWIPE_DISTANCE_PX,
  classifySwipeAxis,
  mainViewAfterSwipeSample,
  mainViewFromLocation,
  reduceSwipeAxis,
} from "./mainViewSwipe.ts";

describe("mainViewFromLocation", () => {
  it("recognizes only the two main views", () => {
    assert.equal(mainViewFromLocation("/"), "tasks");
    assert.equal(mainViewFromLocation("/lists"), "lists");
    assert.equal(mainViewFromLocation("/stats"), null);
    assert.equal(mainViewFromLocation("/settings"), null);
  });
});

describe("classifySwipeAxis", () => {
  it("ignores small movement", () => {
    assert.equal(classifySwipeAxis(8, 2), "pending");
    assert.equal(classifySwipeAxis(0, 10), "pending");
  });

  it("treats a mostly vertical gesture as vertical", () => {
    assert.equal(classifySwipeAxis(12, 40), "vertical");
    assert.equal(classifySwipeAxis(70, 70), "vertical");
    assert.equal(classifySwipeAxis(-30, 80), "vertical");
  });

  it("treats a clearly horizontal gesture as horizontal", () => {
    assert.equal(classifySwipeAxis(-80, 10), "horizontal");
    assert.equal(classifySwipeAxis(90, 20), "horizontal");
  });

  it("leaves a shallow diagonal undecided", () => {
    assert.equal(classifySwipeAxis(80, 60), "pending");
  });
});

describe("reduceSwipeAxis", () => {
  it("keeps a vertical gesture vertical after later sideways movement", () => {
    const scrolled = reduceSwipeAxis("pending", 10, 40);
    assert.equal(scrolled, "vertical");
    assert.equal(reduceSwipeAxis(scrolled, -120, 50), "vertical");
  });

  it("lets a horizontal gesture become vertical if the finger drifts", () => {
    const sideways = reduceSwipeAxis("pending", 40, 8);
    assert.equal(sideways, "horizontal");
    assert.equal(reduceSwipeAxis(sideways, 50, 80), "vertical");
  });
});

describe("mainViewAfterSwipeSample", () => {
  it("moves from tasks to lists when the finger swipes left", () => {
    assert.equal(mainViewAfterSwipeSample("tasks", "horizontal", -SWIPE_DISTANCE_PX), "lists");
  });

  it("moves from lists to tasks when the finger swipes right", () => {
    assert.equal(mainViewAfterSwipeSample("lists", "horizontal", SWIPE_DISTANCE_PX), "tasks");
  });

  it("does not wrap past either end", () => {
    assert.equal(mainViewAfterSwipeSample("tasks", "horizontal", SWIPE_DISTANCE_PX), null);
    assert.equal(mainViewAfterSwipeSample("lists", "horizontal", -SWIPE_DISTANCE_PX), null);
  });

  it("does not switch before the distance threshold", () => {
    assert.equal(
      mainViewAfterSwipeSample("tasks", "horizontal", -(SWIPE_DISTANCE_PX - 1)),
      null,
    );
    assert.equal(
      mainViewAfterSwipeSample("lists", "horizontal", SWIPE_DISTANCE_PX - 1),
      null,
    );
  });

  it("does not switch on a vertical or undecided gesture", () => {
    assert.equal(mainViewAfterSwipeSample("tasks", "vertical", -120), null);
    assert.equal(mainViewAfterSwipeSample("lists", "pending", 120), null);
  });

  it("does not switch when a scroll later drifts sideways", () => {
    const axis = reduceSwipeAxis(reduceSwipeAxis("pending", 6, 28), -140, 36);
    assert.equal(axis, "vertical");
    assert.equal(mainViewAfterSwipeSample("tasks", axis, -140), null);
  });
});
