# Vue Architecture Review

Review the Vue 3 component or file at `$ARGUMENTS` (or the currently open file if no argument given) and analyze it against this project's architecture conventions:

## Check for

**Layer violations**
- Raw Firebase calls outside of `src/firebase/` — all Firestore/Auth access must go through `src/firebase/tasks.ts`, `src/firebase/auth.ts`, or `src/firebase/config.ts`
- Business logic in page components that belongs in a composable (`src/shared/useX.ts`) or store (`src/stores/`)
- State that should be in a Pinia store being kept as local `ref`s

**Composable usage**
- Composables in `src/shared/` must be explicitly imported (they are NOT auto-imported)
- Vue Composition API (`ref`, `computed`, `watch`, etc.) and `@vueuse/core` ARE auto-imported — flag any redundant import statements for these
- Components are auto-imported via `unplugin-vue-components` — no need to import `.vue` files manually

**Store patterns**
- Stores should sync with Firestore where appropriate
- All stores use `pinia-plugin-persistedstate` — flag any local storage access done outside the store layer

**Naming & structure**
- Composables must follow `useX` naming convention
- Pages go in `src/pages/`, shared UI in `src/components/`

**Multi-day task logic**
- Any code touching `durationDays`, `endDate`, or `dailyTimes` should route through `store.ts` or `useTaskLogic.ts`, not be reimplemented inline

## Output

List each issue found with: file path + line number, the problem, and the recommended fix. If no issues, confirm the file follows conventions.
