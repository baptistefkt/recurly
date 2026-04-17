import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "dispatch recurring task reminders",
  { minutes: 15 },
  internal.notifications.pushReminderJobs.dispatchRecurringTaskReminders,
  {}
);

export default crons;
