"use node";

import { v } from "convex/values";
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

let firebaseApp: App | null = null;
let firebaseMessaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging {
  if (firebaseMessaging) {
    return firebaseMessaging;
  }

  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Convex env."
      );
    }

    firebaseApp =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
  }

  firebaseMessaging = getMessaging(firebaseApp);
  return firebaseMessaging;
}

export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const tokens: string[] = await ctx.runQuery(
      internal.notifications.pushTokens.listTokensByUserId,
      {
        userId: args.userId,
      }
    );

    if (tokens.length === 0) {
      return { sentCount: 0, failureCount: 0, invalidTokensRemoved: 0 };
    }

    // Data-only payload: FCM notification payloads are auto-shown by the browser and
    // ignore our service worker `notificationclick` / deep-link logic unless
    // `webpush.fcmOptions.link` is set. Sending data-only lets `src/sw.ts` call
    // `showNotification` with our data so clicks open the app.
    const messaging = getFirebaseMessaging();
    const result = await messaging.sendEachForMulticast({
      tokens,
      data: {
        title: args.title,
        body: args.body,
        ...(args.data ?? {}),
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
      },
    });

    const invalidTokens = await Promise.all(
      result.responses.map(async (response, idx) => {
        if (response.success) return;
        const code = response.error?.code;
        const token = tokens[idx];
        const isInvalid =
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered";
        if (!isInvalid || !token) return null;
        await ctx.runMutation(internal.notifications.pushTokens.deleteTokenByValue, { token });
        return token;
      })
    );

    return {
      sentCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokensRemoved: invalidTokens.filter(Boolean).length,
    };
  },
});
