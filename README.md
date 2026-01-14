# Schedule Manager

A **Vue 3 + Vite** schedule / task manager with **Google sign-in (Firebase Auth)** and **task sync (Cloud Firestore)**.

## Features

- **Google authentication** via Firebase Authentication
- **Tasks by date** stored in Firestore (sync across devices)
- **Pomodoro timer** (focus/break cycles) + optional browser notifications
- **Dark mode** UI styling via UnoCSS

## Tech stack

- **Frontend**: Vue 3, TypeScript, Vite
- **State**: Pinia (+ persisted state)
- **Styling**: UnoCSS
- **Backend-as-a-service**: Firebase (Auth + Firestore)
- **Container**: Docker (build static assets, serve with Nginx)

## Prerequisites

- **Node.js**: 22+ recommended
- **Package manager**: `pnpm` (recommended) or `npm`
- **Firebase project** with:
  - **Authentication** → enable **Google** provider
  - **Cloud Firestore** → create database (test mode for local dev, or proper rules)

## Environment variables

Create a `.env` file in the project root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Notes:
- Vite exposes `VITE_*` variables to the browser. Firebase web config values are generally safe to expose, but **your Firestore security rules must protect data**.

## Getting started (local development)

Install dependencies:

```bash
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Then open `http://localhost:8080`.

What it does:
- Builds the Vite app inside a Node image
- Serves the compiled `dist/` with Nginx on port **80** (mapped to **8080** on your machine)

## Deployment

### Netlify

This repo includes `netlify.toml`. Typical settings:
- **Build command**: `pnpm build` (or `npm run build`)
- **Publish directory**: `dist`

Make sure to set the same Firebase `VITE_FIREBASE_*` variables in Netlify environment settings.

## Optional API proxy / backend (if you have one)

The Vite dev server is configured to proxy `/api` to `http://localhost:9000` (see `vite.config.ts`).

Also, there is a component (`src/components/google.vue`) that posts Google credentials to:
- `http://localhost:9000/api/v1/auth/google`

If you’re not running a backend on port 9000, you can ignore that component (the app’s main login flow uses **Firebase Auth popup**).

## Recommended IDE setup

- **VS Code** + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur)

## License

Add your license here (e.g. MIT) if this project is intended to be shared.
