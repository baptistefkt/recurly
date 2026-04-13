/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as completions from "../completions.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as pushNotificationTriggers from "../pushNotificationTriggers.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushTokens from "../pushTokens.js";
import type * as router from "../router.js";
import type * as tasks from "../tasks.js";
import type * as teamAccess from "../teamAccess.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  completions: typeof completions;
  email: typeof email;
  http: typeof http;
  invites: typeof invites;
  pushNotificationTriggers: typeof pushNotificationTriggers;
  pushNotifications: typeof pushNotifications;
  pushTokens: typeof pushTokens;
  router: typeof router;
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
