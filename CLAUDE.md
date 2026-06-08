# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Type-check + build for production (parallel)
npm run build-only   # Build without type checking
npm run type-check   # Run vue-tsc type checking only
npm run preview      # Preview production build locally
```

No lint or test scripts are configured. The committed lockfile is `pnpm-lock.yaml` (use `pnpm install`); the `npm run` script names above work under either package manager.

### Docker

```bash
docker compose up --build   # Build and run on http://localhost:8080
```

## Architecture

**KeepITs** is a Vue 3 + TypeScript PWA for task/schedule management, backed by Firebase Firestore with real-time sync.

### Layer Structure

| Layer | Location | Responsibility |
|---|---|---|
| Pages (views) | `src/pages/` | Routed views — `HomePage.vue`, `CalendarPage.vue`, `BoardPage.vue`, `ProjectsPage.vue` |
| Components | `src/components/` | Shared UI — `navbar.vue`, `header.vue`, `Login.vue`, `darkmode.vue` |
| Stores (Pinia) | `src/stores/` | Global reactive state with Firestore sync |
| Composables | `src/shared/` | Reusable logic extracted from components (`useX` convention) |
| Firebase API | `src/firebase/` | Firestore CRUD and Auth; raw Firebase calls live here only |
| Utils | `src/utils/` | Pure functions for date/calendar math |

### Key Stores

- `store.ts` — Main schedule store; holds tasks, handles multi-day task logic and per-day time overrides (`dailyTimes`)
- `projects.ts` — Project state, synced via `src/firebase/projects.ts`
- `auth.ts` — Firebase auth state (Google OAuth)
- `user.ts` — User profile data

All stores use `pinia-plugin-persistedstate` for offline resilience.

### Key Composables (`src/shared/`)

- `useTaskLogic.ts` — Task status computation (`ACTIVE NOW`, `UP NEXT`, `In Progress`) and auto-completion
- `useTimer.ts` — Pomodoro timer with explicit `work`/`break` states
- `useCalendar.ts` — Calendar navigation and date window logic
- `useDragDrop.ts` — Drag-and-drop between calendar/board slots
- `useNotifications.ts` — Browser push notification integration

> Note: composables in `src/shared/` are NOT auto-imported. The AutoImport plugin scans `src/composables/` (non-existent). Import them explicitly. Vue Composition API (`ref`, `computed`, etc.), `@vueuse/core`, and all components are auto-imported globally.

### Data Model

Tasks are keyed in Firestore as `{userId}_{dateKey}_{taskId}`. The `Task` interface (`src/firebase/tasks.ts`) includes:
- `durationDays` / `endDate` / `dailyTimes` — multi-day span support
- `meetingType` (`none` | `google` | `teams` | `custom`), `meetingUrl`, `guestEmails` — meeting integration fields
- `order` — manual sort order within a day

### Routing (`src/router/index.ts`)

Four routes: `/` (Home), `/board` (Board), `/calendar` (Calendar), `/projects` (Projects). All page components are lazy-loaded.

### Styling

UnoCSS (Tailwind-compatible) with three presets: `presetUno` (utility classes), `presetAttributify` (attribute mode, e.g. `text="green-400"`), `presetIcons` (e.g. `i-carbon-close`). Dark theme default (`#070c09` background, `#4ade80` green accent); dark mode is `class`-based (toggling a class, not media query). Use `dark:` prefix for dark-mode variants.

> The effective UnoCSS config — presets plus the custom shortcuts (`border-base`, `bg-base`, `bg-canvas`, `icon-btn`) — lives **inline in `vite.config.ts`**. The root `uno.config.ts` is a separate, minimal config (no shortcuts) and is not what the build uses; edit `vite.config.ts` for shortcut/preset changes.

### Dev Proxy

`/api/*` requests in dev are proxied to `http://localhost:9000` (strips `/api` prefix).

### Environment Variables

Create a `.env` file with Firebase credentials:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

### PWA

Configured via `vite-plugin-pwa` with Workbox. Cache-first for fonts/static assets, network-first for API calls. Service worker prompts users on update.
