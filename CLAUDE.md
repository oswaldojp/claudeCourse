# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
npm run setup          # install deps + prisma generate + migrate

# Development
npm run dev            # Next.js dev server with Turbopack at localhost:3000

# Build & start
npm run build
npm run start

# Lint
npm run lint

# Tests
npm test               # run all tests with vitest
npm test -- src/components/chat/__tests__/ChatInterface.test.tsx   # run a single test file

# Database
npm run db:reset       # drop and re-create the SQLite database
npx prisma studio      # visual DB browser
```

`node-compat.cjs` is required via `NODE_OPTIONS` on every npm script. It deletes `globalThis.localStorage/sessionStorage` so Node 25's experimental Web Storage API doesn't break SSR guards.

## Architecture

### Request flow

1. User types a prompt → `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls Vercel AI SDK's `useChat` hook, which posts to `/api/chat` with the current message history **and the serialized virtual file system**.
2. `src/app/api/chat/route.ts` reconstructs a `VirtualFileSystem` instance from the payload, calls `streamText` (up to 40 tool steps with Claude), and streams the response back.
3. The AI uses two tools: `str_replace_editor` (create/str_replace/insert on files) and `file_manager` (rename/delete). Tool calls arrive in the stream and are intercepted client-side by `FileSystemContext.handleToolCall`, which mutates the in-memory VFS and increments `refreshTrigger`.
4. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger`, transpiles every `.jsx/.tsx` file in the VFS with Babel standalone into blob URLs, builds an ES module import map (third-party packages resolved via `esm.sh`), and writes a full HTML document to an `<iframe>`'s `srcdoc`.

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree of `FileNode` objects (no disk I/O). It lives in `FileSystemContext` on the client. When a project is saved to the database, the VFS is serialized to a JSON string (`data` column on `Project`). The API route deserializes it on every request.

**The AI always generates `/App.jsx` as the entry point.** All local imports in generated code must use the `@/` alias (e.g., `@/components/Button`).

### Provider / mock mode

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is absent, it returns `MockLanguageModel` — a scripted multi-step response that creates a component and an `App.jsx` without calling the real API. The active model for real API calls is `claude-haiku-4-5`.

### Auth

JWT-based, server-only (`jose`). Sessions stored in an `httpOnly` cookie (`auth-token`, 7-day TTL). `src/lib/auth.ts` is marked `server-only`. Middleware protects `/api/projects` and `/api/filesystem` only — the main `/api/chat` route is open but only persists to a project when the user is authenticated.

### Routing & pages

- `/` — anonymous users see the editor; authenticated users are redirected to their latest project (or a newly created one).
- `/[projectId]` — authenticated project view; unauthorized access redirects to `/`.

### Database

Prisma + SQLite (`prisma/dev.db`). Two models: `User` (email/password with bcrypt) and `Project` (`messages` and `data` columns are JSON strings, not structured columns).

### Key context providers (must wrap together)

`FileSystemProvider` must be a parent of `ChatProvider` because `ChatProvider` reads `fileSystem` from `FileSystemContext` to include in the API body.
