# Recurly

**Recurly** is a small web app for tracking **recurring tasks**—habits, chores, or anything you need to repeat on a schedule. You define how often each task should happen, mark completions when you do them, and see at a glance what is due next, what is overdue, and what you finished today.

The UI is a React single-page app; data and auth live on [Convex](https://convex.dev), so lists and stats update in real time without manual refresh.

## What you can do

- **Create and edit tasks** with a title, optional description, recurrence rule, and an optional color tag for quick scanning.
- **Recurrence options**: daily, weekly, biweekly, monthly, or a **custom** interval in days, weeks, or months.
- **Mark a task complete** from the task detail view. Each completion is stored with an optional note and timestamp.
- **Browse history** via a completion timeline per task; individual completions can be removed if you made a mistake.
- **Archive or restore** tasks to hide them from the main lists without deleting history; **delete** a task removes it and its completions.
- **Dashboard**: tabs for **Upcoming**, **All**, and **Archived**; active lists are sorted by next due date and grouped with section headers (**Overdue**, **Today**, **Tomorrow**, **This week**, **Next week**, **This month**, **Next month**, **Later**) using your local calendar (weeks start on Monday). **Archived** is a flat list. Summary cards show total active tasks, overdue count, and tasks completed today.

## How it works

### Data model

Convex stores two main application tables (plus auth tables from Convex Auth):

- **`tasks`** — Owned by the signed-in user. Each row holds title, description, recurrence settings (`recurrenceType` and, for custom rules, `recurrenceInterval` / `recurrenceUnit`), optional `recurrenceDayOfWeek` in the schema, archive flag, and optional `color`.
- **`completions`** — Links to a task and user, with `completedAt` and optional `note`. Listing completions is ordered by time so the UI can show recent history.

### Next due date and “overdue”

The app does **not** spawn separate “instances” of a task per period. Instead, when tasks are listed, the backend derives **`nextDueAt`** from the task’s recurrence rule and the **most recent completion** (or “now” if there has never been a completion). That timestamp drives sorting on the Upcoming tab and whether a task counts as overdue compared to the current time.

### Frontend and backend

- **`src/`** — Vite + React + TypeScript UI: landing/sign-in, `TaskDashboard` (stats, tabs, list), `TaskCard`, `TaskModal` (create/edit/delete), detail modal with `CompletionTimeline`, toast notifications (Sonner), Tailwind for styling.
- **`convex/`** — Queries and mutations for tasks (`tasks.ts`) and completions (`completions.ts`), schema (`schema.ts`), and Convex Auth (`auth.ts`, `auth.config.ts`). All task and completion APIs enforce the authenticated user.

`npm run dev` starts the Vite dev server and `convex dev` together so the client can talk to your local Convex backend.

## Stack and tooling

React (Vite, TypeScript, Tailwind) and [Convex](https://convex.dev) for data and auth. Set `VITE_CONVEX_URL` via `npx convex dev` / your deployment so the client can connect.

**Authentication** uses [Convex Auth](https://auth.convex.dev/) with anonymous sign-in for a low-friction demo experience. Consider tightening or changing auth before a production deployment.

## HTTP API

User-defined HTTP routes are registered in `convex/router.ts` and wired from `convex/http.ts` (kept separate so auth routes stay stable). Convex Auth adds its routes when `auth.addHttpRoutes` runs.

## Developing and deploying

- Convex: [Overview](https://docs.convex.dev/understanding/), [Hosting and deployment](https://docs.convex.dev/production/), [Best practices](https://docs.convex.dev/understanding/best-practices/)
- Local development: `npm run dev` (frontend + backend)
- Production build: `npm run build` (frontend; deploy Convex functions and env via the Convex CLI/dashboard as usual)

## Web push notifications (FCM + Convex)

This app includes browser push notifications using Firebase Cloud Messaging.

### 1) Firebase setup

1. Create a Firebase project.
2. Enable **Cloud Messaging**.
3. In Project Settings, collect your web app config:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
4. In Cloud Messaging, generate a **Web Push certificate key pair** and copy the **public VAPID key**.
5. Create a Firebase service account and copy:
   - `project_id`
   - `client_email`
   - `private_key`

### 2) Environment variables

Copy `.env.example` to `.env.local` and fill all `VITE_FIREBASE_*` values.

Set server-side Firebase Admin credentials in Convex:

```bash
npx convex env set FIREBASE_PROJECT_ID "<project_id>"
npx convex env set FIREBASE_CLIENT_EMAIL "<client_email>"
npx convex env set FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3) Service worker

`src/sw.ts` handles both PWA caching/offline shell and Firebase background notifications.  
It is built to `/sw.js` and registered by the app.

### 4) Convex API added

- `pushTokens` table in `convex/schema.ts`
- `convex/pushTokens.ts`
  - `savePushToken`
  - `removePushToken`
  - `myPushTokens`
- `convex/pushNotifications.ts`
  - `sendPushNotification` (internal Node action, Firebase Admin multicast)

### 5) Frontend integration

- `src/lib/firebaseMessaging.ts` initializes FCM in the browser.
- `src/hooks/usePushNotifications.ts`:
  - requests permission
  - registers service worker
  - gets FCM token
  - saves token in Convex
  - listens for foreground messages and shows toast notifications

### 5.1) Automatic recurring task reminders

The backend runs a cron every 15 minutes and sends reminders to users with push tokens.

- **Due soon reminder**: sent before due time (default: 30 minutes).
- **Overdue reminder**: sent after due time (default delay: 30 minutes, max window: 24h).
- **De-duplication**: each reminder type is sent at most once per task recurrence cycle.
- **Team behavior**:
  - for team tasks with assignees, reminders go to assignees;
  - for team tasks without assignees, reminders go to the task creator.

### 5.2) Per-user reminder settings

Each user can configure reminder behavior from **User menu → Reminder settings**:

- Enable/disable push reminders
- Due soon lead time (minutes)
- Overdue reminders on/off
- Overdue delay and overdue window
- Quiet hours start/end (local hour)

Quiet hours are evaluated using the browser timezone offset captured when saving settings.

### 6) Running locally / HTTPS

Push notifications require a secure context:

- Production/staging must use HTTPS.
- Localhost works for development in modern browsers.

Then run:

```bash
npm run dev
```

### 7) Testing checklist

- Browser asks for notification permission.
- Token is generated and appears in `pushTokens`.
- Foreground message appears as a toast.
- Background message appears as system notification when the app is not focused.
