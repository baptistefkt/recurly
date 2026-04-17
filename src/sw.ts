/// <reference lib="webworker" />

import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
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
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || "Recurly";
    const body =
      payload.notification?.body || payload.data?.body || "You have a new notification";

    void self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: payload.data || {},
    });
  });
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: Record<string, unknown> = {};
  try {
    data = event.data.json() as Record<string, unknown>;
  } catch {
    data = { title: "Recurly", body: event.data.text() };
  }

  const notification = (data.notification ?? {}) as Record<string, unknown>;
  const title = String(data.title ?? notification.title ?? "Recurly");
  const body = String(data.body ?? notification.body ?? "You have a new notification");

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const raw = event.notification.data;
      const data =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const targetUrl = new URL(notificationTargetPath(data), self.location.origin).href;

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const reusableClient = clients.find((client) => "focus" in client);
      if (reusableClient) {
        const windowClient = reusableClient as WindowClient;
        await windowClient.navigate(targetUrl);
        await windowClient.focus();
        return;
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
