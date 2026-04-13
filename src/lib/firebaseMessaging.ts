import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

type FirebaseMessagingConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type ForegroundMessageHandler = (payload: MessagePayload) => void;

function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export function getFirebaseMessagingConfig(): FirebaseMessagingConfig {
  return {
    apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
    authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requiredEnv("VITE_FIREBASE_APP_ID"),
  };
}

export function getFirebaseVapidKey(): string {
  return requiredEnv("VITE_FIREBASE_VAPID_KEY");
}

function getFirebaseApp(config: FirebaseMessagingConfig): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export async function initializeFirebaseMessaging(
  config: FirebaseMessagingConfig
): Promise<Messaging | null> {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(getFirebaseApp(config));
}

export function getPushServiceWorkerUrl(): string {
  return "/sw.js";
}

export async function getBrowserPushToken(
  messaging: Messaging,
  vapidKey: string,
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<string | null> {
  try {
    return await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    });
  } catch (error) {
    // Some environments reject a bad/rotated VAPID key with a generic push service
    // error. Retry once without an explicit key to verify if VAPID is the blocker.
    if (error instanceof Error && error.message.includes("push service error")) {
      return await getToken(messaging, { serviceWorkerRegistration });
    }
    throw error;
  }
}

export function subscribeToForegroundMessages(
  messaging: Messaging,
  handler: ForegroundMessageHandler
) {
  return onMessage(messaging, handler);
}
