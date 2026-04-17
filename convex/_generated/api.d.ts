/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as completions from "../completions.js";
import type * as crons from "../crons.js";
import type * as email_ResendOTPPasswordReset from "../email/ResendOTPPasswordReset.js";
import type * as email_email from "../email/email.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as notifications_pushNotifications from "../notifications/pushNotifications.js";
import type * as notifications_pushReminderJobs from "../notifications/pushReminderJobs.js";
import type * as notifications_pushTokens from "../notifications/pushTokens.js";
import type * as notifications_reminderPreferences from "../notifications/reminderPreferences.js";
import type * as notifications_taskReminders from "../notifications/taskReminders.js";
import type * as recurrence from "../recurrence.js";
import type * as router from "../router.js";
import type * as stats from "../stats.js";
import type * as tasks from "../tasks.js";
import type * as teamAccess from "../teamAccess.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  completions: typeof completions;
  crons: typeof crons;
  "email/ResendOTPPasswordReset": typeof email_ResendOTPPasswordReset;
  "email/email": typeof email_email;
  http: typeof http;
  invites: typeof invites;
  "notifications/pushNotifications": typeof notifications_pushNotifications;
  "notifications/pushReminderJobs": typeof notifications_pushReminderJobs;
  "notifications/pushTokens": typeof notifications_pushTokens;
  "notifications/reminderPreferences": typeof notifications_reminderPreferences;
  "notifications/taskReminders": typeof notifications_taskReminders;
  recurrence: typeof recurrence;
  router: typeof router;
  stats: typeof stats;
  tasks: typeof tasks;
  teamAccess: typeof teamAccess;
  teams: typeof teams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
