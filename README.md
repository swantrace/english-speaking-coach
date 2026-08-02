# English Speaking Coach

English Speaking Coach is a full-stack language-learning platform for realistic
spoken-English practice. It combines low-latency voice conversation with
reusable scenarios, structured learning material, persistent practice history,
and asynchronous feedback.

The repository is both a working personal learning tool and a reference
implementation for developers interested in production-oriented voice
applications, asynchronous workflows, private media delivery, and TypeScript
monorepo architecture.

## Product experience

- Practise through interruptible free-form conversations and structured
  role-play sessions
- Create, review, repeat, and reuse scenarios with goals, characters, example
  dialogue, and private cover images
- Write free-form conversation context with rich text or Markdown source
- Receive progressive post-session review, error analysis, rewritten role-play
  turns, and knowledge occurrences without waiting for every background job
- Listen to a corrected version of an individual role-play or play completed
  conversations continuously from a private student playlist
- Keep practice history and learning data available across local and deployed
  environments
- Review extracted knowledge occurrences before promoting them into the learner
  knowledge catalog
- Manage users, content, background jobs, inference requests, and failures
  through administrative views

## Engineering highlights

- **Realtime voice pipeline:** an interruptible LiveKit Agent exchanges audio,
  transcripts, goal progress, and coaching events with the browser
- **Asynchronous processing:** BullMQ workers keep generation and analysis work
  outside latency-sensitive API and voice paths; Redis-backed SSE publishes
  durable progress to open history pages
- **Private media lifecycle:** authenticated uploads, ownership checks,
  short-lived signed URLs, checksums, replacement cleanup, and retryable deletion
  support S3-compatible object storage
- **Corrected role-play listening:** rewritten learner turns and original coach
  replies are synthesized into one private conversation without retaining the
  learner's original voice recording
- **Shared contracts:** Zod schemas and workspace packages keep the React client,
  Hono backend, and Agent aligned
- **Portable infrastructure:** local Docker services for development and managed
  Turso, Upstash, Cloudflare R2, LiveKit Cloud, Fly.io, and Vercel for shared
  practice
- **Quality gates:** TypeScript, Biome, Vitest, Turborepo caching, and
  change-aware GitHub Actions

## Architecture

```mermaid
graph LR
  Browser[React web app] -->|HTTP and SSE| API[Hono API]
  Browser -->|WebRTC| LiveKit[LiveKit]
  LiveKit -->|WebRTC| Browser
  Agent[LiveKit voice Agent] -->|Audio and data| LiveKit
  LiveKit -->|Audio and data| Agent
  Agent -->|Internal API| API
  API --> Database[(Turso and libSQL)]
  API --> Storage[(R2 and MinIO)]
  API --> Queue[(Upstash and Redis)]
  Worker[BullMQ worker] --> Queue
  Worker --> Database
  Worker --> Inference[External inference services]
  Worker --> Storage
  Browser -->|Short-lived signed media URLs| Storage
```

## Technology

| Area | Stack |
| --- | --- |
| Web | React 19, Vite, TanStack Router and Query, Tailwind CSS |
| API | Hono, Bun, Better Auth |
| Voice Agent | LiveKit Agents for Node.js and WebRTC |
| Data | Drizzle ORM, libSQL/Turso |
| Jobs | BullMQ, Redis/Upstash |
| Storage | Private S3-compatible MinIO/Cloudflare R2 objects and signed URLs |
| Monorepo | pnpm workspaces, Turborepo, TypeScript |
| Testing and quality | Vitest, Bun Test, Biome, GitHub Actions |

## Repository layout

```text
apps/
  web/       React browser application
  backend/   Hono API and BullMQ worker
  agent/     LiveKit voice Agent
packages/
  contract/  Shared API contracts and validation schemas
  database/  Drizzle schema, migrations, and libSQL client
  domain/    Shared domain constants and types
  prompts/   Generation and analysis prompts
  storage/   Private S3-compatible object storage and media helpers
  ui/        Shared React components
```

## Develop locally

### Prerequisites

- Node.js 20 or newer; the latest LTS through
  [fnm](https://github.com/Schniz/fnm) is recommended
- pnpm 10 or newer
- [Bun](https://bun.sh/)
- Docker with Docker Compose

Install dependencies and create local configuration:

```sh
pnpm install
cp apps/backend/.env.example apps/backend/.env.local
cp apps/agent/.env.example apps/agent/.env.local
cp apps/web/.env.example apps/web/.env.local
```

The committed examples provide safe local infrastructure defaults and document
the credentials that still need to be supplied. Add credentials only to ignored
local files or deployment secret stores; never commit `.env.local` files.

Start LiveKit, Redis, MinIO, the web app, API, and worker:

```sh
pnpm run dev:full
```

Run the voice Agent in another terminal:

```sh
pnpm run dev:agent
```

Alternatively, start the full local stack including the Agent:

```sh
pnpm run dev:full:agent
```

Local endpoints:

| Service | Address |
| --- | --- |
| Web | `http://localhost:5173` |
| API | `http://localhost:3001` |
| LiveKit | `ws://localhost:7880` |
| Redis | `redis://localhost:6379` |
| MinIO API | `http://localhost:9000` |
| MinIO console | `http://localhost:9001` |

## Environment profiles

The project supports two local workflows:

- `pnpm run dev:development` selects local-service configuration for feature
  development and runs the Agent against the local LiveKit server.
- `pnpm run dev:practice` selects cloud-backed configuration so practice data is
  available from multiple computers, and runs the Agent locally so it can call
  the local backend directly. The LiveKit Cloud Agent deployment is not used by
  this command.

Create the ignored `.env.development.local` and `.env.practice.local` files for
the backend and Agent before using these commands. The profile script copies the
selected values into each app's `.env.local`.

Each environment example documents only the variables owned by that component:

- [`apps/backend/.env.example`](apps/backend/.env.example)
- [`apps/agent/.env.example`](apps/agent/.env.example)
- [`apps/web/.env.example`](apps/web/.env.example)
- [`packages/database/.env.example`](packages/database/.env.example)

## Useful commands

```sh
pnpm run build
pnpm run test
pnpm run lint
pnpm run format-and-lint
pnpm run format-and-lint:fix
pnpm run db:generate
pnpm run db:push
pnpm run infra:up
pnpm run infra:down
```

Before opening a pull request:

```sh
pnpm run format-and-lint:fix
pnpm run build
pnpm run test
```

## Deployment

The reference deployment uses Vercel for the web app, Fly.io for the API and
worker, LiveKit Cloud for the Agent, Turso for the database, Upstash for Redis,
and Cloudflare R2 for object storage.

GitHub Actions validates pull requests and deploys only affected services after
changes reach `main`. See the
[deployment guide](docs/deployment.md) for account setup, secrets, environment
variables, and deployment commands.

The hosted instance is intentionally a personal environment and discourages
search-engine indexing. Developers should deploy their own infrastructure and
credentials rather than rely on that instance.

Practice media remains private. The backend authorizes access before returning
a short-lived object URL, and the browser fetches playlist URLs lazily instead
of exposing permanent public objects.