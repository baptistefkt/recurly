import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateRecurrencePeriodMs,
  formatDueSoonLead,
  reminderWindowsForPeriodMs,
  reminderWindowsForTask,
} from "./reminderTiming.ts";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

describe("estimateRecurrencePeriodMs", () => {
  it("maps fixed recurrence types", () => {
    assert.equal(estimateRecurrencePeriodMs({ recurrenceType: "daily" }), DAY_MS);
    assert.equal(estimateRecurrencePeriodMs({ recurrenceType: "weekly" }), 7 * DAY_MS);
    assert.equal(estimateRecurrencePeriodMs({ recurrenceType: "biweekly" }), 14 * DAY_MS);
    assert.equal(estimateRecurrencePeriodMs({ recurrenceType: "monthly" }), 30 * DAY_MS);
    assert.equal(estimateRecurrencePeriodMs({ recurrenceType: "once" }), 30 * DAY_MS);
  });

  it("estimates weeklyDays from selected weekdays", () => {
    assert.equal(
      estimateRecurrencePeriodMs({
        recurrenceType: "weeklyDays",
        recurrenceDaysOfWeek: [1, 3, 5],
      }),
      (7 * DAY_MS) / 3
    );
  });

  it("estimates custom interval in months", () => {
    assert.equal(
      estimateRecurrencePeriodMs({
        recurrenceType: "custom",
        recurrenceInterval: 6,
        recurrenceUnit: "months",
      }),
      180 * DAY_MS
    );
  });
});

describe("reminderWindowsForPeriodMs", () => {
  it("uses 30 min windows for daily cadence", () => {
    assert.deepEqual(reminderWindowsForPeriodMs(DAY_MS), {
      dueSoonMs: 30 * MINUTE_MS,
      overdueDelayMs: 30 * MINUTE_MS,
      maxOverdueMs: 12 * HOUR_MS,
    });
  });

  it("uses weekly bucket for 7-day period", () => {
    assert.deepEqual(reminderWindowsForPeriodMs(7 * DAY_MS), {
      dueSoonMs: 6 * HOUR_MS,
      overdueDelayMs: 4 * HOUR_MS,
      maxOverdueMs: 2 * DAY_MS,
    });
  });

  it("uses monthly bucket for 30-day period", () => {
    assert.deepEqual(reminderWindowsForPeriodMs(30 * DAY_MS), {
      dueSoonMs: DAY_MS,
      overdueDelayMs: DAY_MS,
      maxOverdueMs: 5 * DAY_MS,
    });
  });

  it("uses semi-annual bucket for 6-month custom period", () => {
    assert.deepEqual(reminderWindowsForPeriodMs(180 * DAY_MS), {
      dueSoonMs: 2 * DAY_MS,
      overdueDelayMs: 2 * DAY_MS,
      maxOverdueMs: 10 * DAY_MS,
    });
  });

  it("uses yearly+ bucket for long periods", () => {
    assert.deepEqual(reminderWindowsForPeriodMs(365 * DAY_MS), {
      dueSoonMs: 7 * DAY_MS,
      overdueDelayMs: 3 * DAY_MS,
      maxOverdueMs: 14 * DAY_MS,
    });
  });
});

describe("reminderWindowsForTask", () => {
  it("treats once like monthly", () => {
    assert.deepEqual(reminderWindowsForTask({ recurrenceType: "once" }), {
      dueSoonMs: DAY_MS,
      overdueDelayMs: DAY_MS,
      maxOverdueMs: 5 * DAY_MS,
    });
  });

  it("scales weeklyDays with three days selected", () => {
    // ~2.33 day period → ≤ 4 days bucket
    assert.deepEqual(
      reminderWindowsForTask({
        recurrenceType: "weeklyDays",
        recurrenceDaysOfWeek: [1, 3, 5],
      }),
      {
        dueSoonMs: 2 * HOUR_MS,
        overdueDelayMs: 2 * HOUR_MS,
        maxOverdueMs: DAY_MS,
      }
    );
  });
});

describe("formatDueSoonLead", () => {
  it("formats minutes, hours, and days", () => {
    assert.equal(formatDueSoonLead(30 * MINUTE_MS), "30 minutes");
    assert.equal(formatDueSoonLead(6 * HOUR_MS), "6 hours");
    assert.equal(formatDueSoonLead(DAY_MS), "1 day");
    assert.equal(formatDueSoonLead(2 * DAY_MS), "2 days");
  });
});
