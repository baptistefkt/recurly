/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Ensure SPA navigations resolve to the cached shell while offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function notificationPayloadData(
  raw: unknown
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;

  // FCM-auto-displayed notifications wrap payload under FCM_MSG.
  const fcmMsg = record.FCM_MSG;
  if (fcmMsg && typeof fcmMsg === "object") {
    const nested = fcmMsg as Record<string, unknown>;
    const nestedData = nested.data;
    if (nestedData && typeof nestedData === "object") {
      return nestedData as Record<string, unknown>;
    }
  }

  return record;
}

function notificationTargetPath(data: Record<string, unknown>): string {
  const taskId = asNonEmptyString(data.taskId);
  if (taskId) {
    const params = new URLSearchParams({ task: taskId });
    return `/?${params.toString()}`;
  }

  const teamId = asNonEmptyString(data.teamId);
  if (teamId) {
    const params = new URLSearchParams({ scope: "team", teamId });
    return `/?${params.toString()}`;
  }

  return "/";
}

async function openNotificationTarget(data: Record<string, unknown>): Promise<void> {
  const targetUrl = new URL(notificationTargetPath(data), self.location.origin).href;

  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if (!("focus" in client)) continue;
    const windowClient = client as WindowClient;
    if (!windowClient.url.startsWith(self.location.origin)) continue;

    await windowClient.focus();
    if ("navigate" in windowClient) {
      await windowClient.navigate(targetUrl);
    }
    return;
  }

  await self.clients.openWindow(targetUrl);
}

// Register before importing FCM so the SDK cannot overwrite click handling.
// See: https://firebase.google.com/docs/cloud-messaging/web/receive-messages
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openNotificationTarget(notificationPayloadData(event.notification.data)));
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

if (hasFirebaseConfig) {
  void import("firebase/app").then(async ({ initializeApp, getApp, getApps }) => {
    const { getMessaging, onBackgroundMessage } = await import("firebase/messaging/sw");
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    onBackgroundMessage(messaging, (payload) => {
      // Messages that include `notification` are already shown by the FCM web stack;
      // calling `showNotification` here would duplicate OS banners.
      if (payload.notification) {
        return;
      }

      const data = payload.data ?? {};
      const title = data.title || "Recurly";
      const body = data.body || "You have a new notification";

      void self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data,
      });
    });
  });
}
