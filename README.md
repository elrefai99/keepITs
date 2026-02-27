# KeepITs – Intelligent Schedule & Task Manager

KeepITs is a modern, aesthetic **Vue 3 + Vite** schedule and task manager designed for deep work and day planning. It includes **Google sign-in (Firebase Auth)**, real-time **task sync (Cloud Firestore)**, a focused **Pomodoro-style timer**, and multiple views including Calendar, Kanban board, and classic list.

## Features

### Advanced Task Scheduling
*   **Time Ranges**: Schedule tasks with precise "From" and "To" times.
*   **Smart Activity Tracking**: 
    *   **ACTIVE NOW**: Tasks currently happening within their time range are highlighted.
    *   **UP NEXT**: Clearly see what's coming up next.
    *   **In Progress**: Tasks remain "Active" (not auto-completed) until their scheduled End Time passes.
*   **Drag & Drop**: Easily reorder tasks or move them between Kanban columns.
*   **Meeting Integration**: 
    *   Direct links for **Google Meet** and **Microsoft Teams**.
    *   One-click **Google Calendar** event creation with pre-filled details.
*   **Guest Invites**: Add guest emails to tasks for easy reference.

### Multiple Views
*   **Calendar View**: 
    *   **Month**: Overview of your entire month's workload.
    *   **Week**: Microsoft Teams-style vertical week view with hourly slots.
    *   **Day**: Detailed hourly breakdown of your day.
*   **Kanban Board**: Trello-style board to manage tasks through "To Do", "In Progress", and "Done" stages.
*   **List View**: A classic, sorted list of your daily agenda.

### Productivity Tools
*   **Smart Focus Timer**: 
    *   **Pomodoro-style** timer (50/10 min cycles).
    *   **Auto-Sync**: When you start a task, the timer can automatically set itself to the remaining duration of that task.
    *   **Notifications**: Browser notifications for task starts and break times.
*   **Detailed Stats**: Daily task counts and meeting summaries.

### Modern UI/UX
*   **Dark Mode**: Fully supported, sleek dark theme.
*   **Responsive Design**: Optimized for Desktop (grid calendars) and Mobile (list views).
*   **Teams-Style Indicator**: A "current time" red line indicator in Week and Day views.

### Progressive Web App (PWA)
*   **📱 Installable**: Install the app on any device (desktop or mobile) - works like a native app!
*   **🔌 Offline Support**: Continue working even without an internet connection.
*   **🔄 Auto-Updates**: Automatically updates to the latest version with user notification.
*   **⚡ Fast Performance**: Lightning-fast load times with intelligent caching.
*   **📲 Cross-Platform**: Works on Windows, Mac, Linux, iOS, and Android.

## Tech Stack

*   **Frontend**: [Vue 3](https://vuejs.org/) (Composition API), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
*   **State Management**: [Pinia](https://pinia.vuejs.org/) (with persisted state)
*   **Styling**: [UnoCSS](https://unocss.dev/) (Utility-first CSS engine)
*   **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication, Cloud Firestore)
*   **Icons**: SVG & Iconify

## Getting Started

### Prerequisites
*   **Node.js**: v18+ recommended
*   **pnpm** (recommended) or npm
*   **Firebase Project**:
    1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com/)
    2.  Enable **Authentication** (Google Sign-in provider)
    3.  Create a **Cloud Firestore** database

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/elrefai99/keepITs.git
    cd keepITs
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server**
    ```bash
    pnpm dev
    ```

## Docker Support

Build and serve the production version using Docker Compose:

```bash
docker compose up --build
```
Access the app at `http://localhost:8080`.

## Deployment

### Netlify
1.  Connect your repository to Netlify.
2.  Set Build Command: `pnpm build`
3.  Set Publish Directory: `dist`
4.  Add your `VITE_FIREBASE_*` environment variables in Netlify settings.

### Docker
The included `Dockerfile` builds the app and serves it via Nginx, ready for any container orchestration platform.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open-source and available under the [MIT License](LICENSE).
