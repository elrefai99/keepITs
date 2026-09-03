# Repository Guidelines

## Project Structure & Module Organization

- `www/` contains the Vue 3 + TypeScript + Vite frontend. Components and application code live in `www/src/`; static assets belong in `www/public/`.
- `package/` contains the Go task-management CLI. Its entrypoint is `package/main.go`, Cobra commands are in `package/cmd/`, domain models and operations are in `package/internal/command/`, and JSON data is stored in `package/json/`.
- `server/proxy/` is a separate Go module for the proxy service, with its entrypoint in `server/proxy/cmd/` and implementation in `server/proxy/internal/`.
- `assets/` contains repository-level assets. Keep generated output such as `www/dist/` out of source changes unless a release explicitly requires it.

## Build, Test, and Development Commands

Run frontend commands from `www/`:

```bash
pnpm install       # install dependencies
pnpm dev           # start the Vite development server
pnpm build         # type-check and build for production
pnpm preview       # preview the production build
```

Run Go commands from each module directory:

```bash
go test ./...       # run all Go tests
go run . add        # run the task CLI add command (from package/)
go build ./...      # compile the module
```

## Coding Style & Naming Conventions

Use `gofmt` for Go and the repository’s TypeScript/Vue formatting conventions. Use PascalCase for exported Go identifiers, camelCase for local variables and TypeScript members, and descriptive kebab-case names for CLI commands. Keep environment files local; update `.env.example` when adding required variables.

## Testing Guidelines

Go tests should be colocated with the package under test and named `*_test.go`; run `go test ./...` before submitting. Frontend changes should at minimum pass `pnpm build`, which includes TypeScript checking. Add focused tests for new task logic, command behavior, and significant UI state changes.

## Commit & Pull Request Guidelines

Use concise Conventional Commit subjects, such as `feat: add task command`, `fix: handle missing config`, or `refactor: simplify task model`. Pull requests should explain the behavior change, list validation commands, link related issues when applicable, and include screenshots or recordings for visible UI changes. Avoid committing secrets, `.env` files, dependency directories, or unrelated generated artifacts.

## Security & Configuration

Configure Firebase and other local settings through environment variables. Never commit credentials or production configuration. Review changes involving authentication, Firestore access, proxy allowlists, and rate limiting carefully.

## Permissions

Global rule:

- Ask the user first before making any code change.
- Show the intended change for review when possible.
- Wait for the user to accept or reject the change before editing project code.
- Always keep the changes in the code to be as simple as possible, straight to the point, with no comments added

### Allow

- Read tracked project files needed for the task.
- Read source code under `src/`, configuration under `config/`, and docs such as `README.md`, `CLAUDE.md`, and this file.
- Create new source or documentation files when they are required for the requested change.
- Edit application code, route files, models, middleware, utilities, tests, and markdown documentation.
- Update `package.json` when the task explicitly requires script or dependency changes.
- Run safe repo-local commands such as `rg`, `ls`, `sed`, `git status`, `pnpm lint`, and `pnpm test`.

### Deny

- Do not read, print, or copy secrets from `.env`, `.env.dev`, or any credential file.
- Do not modify `.env`, `.env.dev`, or other secret-bearing files unless the user explicitly asks.
- Do not modify `node_modules/`, generated caches, or log files.
- Do not change `pnpm-lock.yaml` unless dependency work is part of the task.
- Do not delete files, rename major directories, or rewrite large parts of the codebase without explicit approval.
- Do not run destructive git or shell commands such as `git reset --hard`, `git checkout --`, or broad `rm` operations.
- Do not alter deployment/infrastructure files (`Dockerfile`, `docker-compose.yml`, `ecosystem.config.cjs`) unless the task explicitly requires it.
