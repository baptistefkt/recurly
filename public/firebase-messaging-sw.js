/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

const searchParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: searchParams.get("apiKey"),
  authDomain: searchParams.get("authDomain"),
  projectId: searchParams.get("projectId"),
  storageBucket: searchParams.get("storageBucket"),
  messagingSenderId: searchParams.get("messagingSenderId"),
  appId: searchParams.get("appId"),
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

if (hasFirebaseConfig) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      payload.notification?.title || payload.data?.title || "Recurly";
    const body =
      payload.notification?.body ||
      payload.data?.body ||
      "You have a new notification";
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      data: payload.data || {},
    });
  });
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Recurly", body: event.data.text() };
  }
  const title = data.title || data.notification?.title || "Recurly";
  const body = data.body || data.notification?.body || "You have a new notification";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
