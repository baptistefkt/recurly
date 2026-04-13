import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import {
  buildServiceWorkerUrl,
  getBrowserPushToken,
  getFirebaseMessagingConfig,
  getFirebaseVapidKey,
  initializeFirebaseMessaging,
  subscribeToForegroundMessages,
} from "@/lib/firebaseMessaging";

const TOKEN_STORAGE_KEY = "recurly:pushToken";

type PushNotificationStatus =
  | "idle"
  | "unsupported"
  | "permission-denied"
  | "ready"
  | "error";

type UsePushNotificationsResult = {
  status: PushNotificationStatus;
  permission: NotificationPermission | null;
  token: string | null;
  error: string | null;
  triggerTestNotification: (title: string, body: string) => Promise<void>;
};

async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (registration.active) {
    return registration;
  }

  const worker = registration.installing ?? registration.waiting;
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      const onStateChange = () => {
        if (worker.state === "activated") {
          worker.removeEventListener("statechange", onStateChange);
          resolve();
        } else if (worker.state === "redundant") {
          worker.removeEventListener("statechange", onStateChange);
          reject(new Error("Service worker became redundant before activation."));
        }
      };
      worker.addEventListener("statechange", onStateChange);
    });
  }

  await navigator.serviceWorker.ready;
  return registration;
}

function formatPushSetupError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Unable to initialize push notifications.";
  }
  const message = err.message;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";

  if (message.includes("Registration failed - push service error")) {
    return (
      "Push registration failed. Verify VITE_FIREBASE_VAPID_KEY is the Web Push PUBLIC key " +
      "from the same Firebase project as VITE_FIREBASE_MESSAGING_SENDER_ID, then clear site " +
      "service workers and reload."
    );
  }

  if (code.includes("messaging/token-subscribe-failed")) {
    return "Push subscribe failed. Check VAPID key, sender ID, and browser push permissions.";
  }
  if (code.includes("messaging/permission-blocked")) {
    return "Notifications are blocked for this site in browser settings.";
  }
  if (code.includes("messaging/unsupported-browser")) {
    return "This browser does not support Firebase web push notifications.";
  }

  return code ? `${code}: ${message}` : message;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const savePushToken = useMutation(api.pushTokens.savePushToken);
  const removePushToken = useMutation(api.pushTokens.removePushToken);
  const triggerMyPushNotification = useMutation(
    api.pushNotificationTriggers.triggerMyPushNotification
  );

  const [status, setStatus] = useState<PushNotificationStatus>("idle");
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let unsubscribeForeground: (() => void) | undefined;

    const initialize = async () => {
      try {
        if (typeof window === "undefined") return;
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          if (!isCancelled) setStatus("unsupported");
          return;
        }
        if (!window.isSecureContext) {
          if (!isCancelled) {
            setStatus("error");
            setError("Push notifications require HTTPS.");
          }
          return;
        }

        const firebaseConfig = getFirebaseMessagingConfig();
        const vapidKey = getFirebaseVapidKey();
        const messaging = await initializeFirebaseMessaging(firebaseConfig);
        if (!messaging) {
          if (!isCancelled) setStatus("unsupported");
          return;
        }

        const permissionValue =
          Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;
        if (isCancelled) return;

        setPermission(permissionValue);
        if (permissionValue !== "granted") {
          const previousToken = localStorage.getItem(TOKEN_STORAGE_KEY);
          if (previousToken) {
            await removePushToken({ token: previousToken });
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
          setStatus("permission-denied");
          return;
        }

        const swUrl = buildServiceWorkerUrl(firebaseConfig);
        const serviceWorkerRegistration = await navigator.serviceWorker.register(
          swUrl
        );
        await waitForActiveServiceWorker(serviceWorkerRegistration);

        const nextToken = await getBrowserPushToken(
          messaging,
          vapidKey,
          serviceWorkerRegistration
        );
        if (!nextToken) {
          if (!isCancelled) {
            setStatus("error");
            setError("Failed to get FCM token.");
          }
          return;
        }

        const previousToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (previousToken && previousToken !== nextToken) {
          await removePushToken({ token: previousToken });
        }
        await savePushToken({ token: nextToken });
        localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);

        unsubscribeForeground = subscribeToForegroundMessages(
          messaging,
          (payload) => {
            const title =
              payload.notification?.title ?? payload.data?.title ?? "Recurly";
            const body =
              payload.notification?.body ??
              payload.data?.body ??
              "You have a new notification";
            toast(title, { description: body });
          }
        );

        if (!isCancelled) {
          setToken(nextToken);
          setStatus("ready");
          setError(null);
        }
      } catch (err) {
        const message = formatPushSetupError(err);
        if (!isCancelled) {
          setStatus("error");
          setError(message);
        }
      }
    };

    void initialize();

    return () => {
      isCancelled = true;
      unsubscribeForeground?.();
    };
  }, [removePushToken, savePushToken]);

  const triggerTestNotification = useCallback(
    async (title: string, body: string) => {
      await triggerMyPushNotification({ title, body });
    },
    [triggerMyPushNotification]
  );

  return { status, permission, token, error, triggerTestNotification };
}
