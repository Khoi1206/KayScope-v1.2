# KayScope

> A collaborative API testing platform — build, test, and document HTTP APIs as a team.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is KayScope?

KayScope is a self-hosted, open-source API testing platform inspired by Postman. It brings together HTTP request execution, team workspaces, real-time sync, and a visual E2E test builder — all in one app.

It is built with a clean-architecture backend (domain → use-case → infrastructure → presentation), a React/Tailwind frontend, and first-class TypeScript throughout.

**Key differentiators:**
- Real-time collaboration via Server-Sent Events — every workspace member sees activity as it happens
- Visual E2E test builder powered by Blockly — drag blocks to generate and run Playwright tests, no code required
- Postman-compatible scripting (`pm.*` API) running in isolated Web Workers
- AES-256-GCM encrypted environment secrets at rest
- Full i18n support (English + Vietnamese)

---

## Features

| Category | Details |
|---|---|
| **HTTP Requests** | Params, headers, body (JSON / form-data / raw / binary), auth (Bearer, Basic, API Key) |
| **Collections** | Hierarchical folders, bulk select, drag-and-drop ordering |
| **Environments** | Per-workspace secrets with `{{variableName}}` interpolation, AES-256-GCM encryption at rest |
| **Scripts** | Pre/post-request scripts via sandboxed `pm.*` API in Web Workers (10 s timeout) |
| **History** | Full execution history with request/response snapshots and one-click replay |
| **Collection Runner** | Run an entire collection or folder in sequence, with per-request results |
| **Team Workspaces** | Role-based access (Owner / Editor / Viewer), member invite system |
| **Real-Time Sync** | SSE stream keeps all workspace members in sync; capped at 5 connections per user |
| **Import / Export** | Postman v2.1, OpenAPI 3.x, and native KayScope format |
| **Visual Test Builder** | Blockly drag-and-drop → generates + runs Playwright tests (18 custom blocks) |
| **Search** | Cmd+K global search across all collections |
| **Dark / Light Mode** | Postman-inspired aesthetic with theme toggle |
| **i18n** | English and Vietnamese |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | React 18, Tailwind CSS 3, shadcn/ui |
| Auth | NextAuth v5 (JWT, Credentials provider, split edge config) |
| Database | MongoDB 6 |
| Cache | Redis (environment variable cache) |
| HTTP Execution | undici 7 |
| Code Editor | Monaco Editor |
| Visual Test Builder | Blockly 12 |
| E2E Testing | Playwright |
| Unit Testing | Vitest (95 tests) |
| Validation | Zod 4 |
| i18n | next-intl 4 |
| Package Manager | pnpm |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (auth)/             # Login & Register pages
│   ├── api/                # API route handlers
│   ├── dashboard/          # Main app shell
│   └── test-builder/       # Visual E2E test builder
│
├── modules/                # Domain modules (Clean Architecture)
│   ├── auth/               # User authentication & registration
│   ├── workspace/          # Team workspaces & member management
│   ├── collection/         # API collections
│   ├── folder/             # Nested folders within collections
│   ├── request/            # Saved HTTP requests
│   ├── environment/        # Workspace environment variables
│   ├── history/            # Request execution history
│   ├── activity/           # Real-time activity log
│   └── test-run/           # Saved E2E test runs
│
├── lib/                    # Shared infrastructure & utilities
│   ├── db/                 # MongoDB connection & repository factory
│   ├── api/                # Rate limiting, shared limiters, HTTP utils
│   ├── auth/               # NextAuth config (split edge/full), session helpers
│   ├── crypto/             # AES-256-GCM env-secret encryption
│   ├── errors/             # AppError, AuthError, ValidationError hierarchy
│   ├── scripting/          # Web Worker script sandbox & pool
│   └── workspace/          # WorkspaceMembershipService
│
└── types/                  # Global type augmentations (NextAuth session)
```

Each domain module follows Clean Architecture layers:
`domain/` → `infrastructure/` → `presentation/`

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- MongoDB instance (local or Atlas)
- Redis instance (local or managed)

### 1. Clone the repository

```bash
git clone ...
cd kayscope
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:e2e:ui` | Run Playwright in interactive UI mode |
| `pnpm test:e2e:report` | View last Playwright test report |

## Security

| Concern | Mitigation |
|---|---|
| IDOR | `assertMembership()` on every resource access |
| SSRF | Manual redirect loop with hop validation |
| Secret exposure | AES-256-GCM encryption at rest for env vars |
| Brute force | Rate limiting on all mutation routes (100/min per IP) |
| DoS via SSE | Max 5 SSE connections per user per workspace |

Please report security vulnerabilities via a private GitHub issue.

---

## License

MIT — see [LICENSE](LICENSE) for details.
