# English Speaking Coach

A personal English-speaking practice application built around real-time voice
conversation, reusable learning scenarios, knowledge items, and asynchronous
session analysis.

The project is designed for two ways of working:

- **Local development** uses Docker-hosted LiveKit, Redis, and MinIO with a local
  SQLite database.
- **Shared practice** uses LiveKit Cloud, Turso, Upstash Redis, and Cloudflare R2,
  so practice data remains available from both the local application and the
  deployed website.

## What it includes

- Real-time voice practice with a LiveKit Agent
- Deepgram `flux-general-en` speech-to-text
- DeepSeek `deepseek-v4-flash` conversation model with thinking disabled
- Cartesia `sonic-3.5` text-to-speech
- Scenario and knowledge generation
- Background linguistic and conversation analysis
- Email/password authentication
- Persistent practice history and S3-compatible file storage

## Repository structure

```text
apps/
  web/       React and Vite browser application
  backend/   Hono API and BullMQ background worker
  agent/     LiveKit voice agent
packages/
  contract/  Shared API contracts and schemas
  database/  Drizzle schema, migrations, and libSQL client
  domain/    Shared domain constants and types
  prompts/   Generation and analysis prompts
  storage/   S3-compatible object storage
  ui/        Shared React components
```

The monorepo uses pnpm workspaces and Turborepo.

## Prerequisites

Install:

- Node.js LTS, preferably through [fnm](https://github.com/Schniz/fnm)
- pnpm 10 or newer
- [Bun](https://bun.sh/) for the backend
- Docker with Docker Compose

Confirm the tools are available:

```sh
node --version
pnpm --version
bun --version
docker compose version
```

## Local setup

Install dependencies:

```sh
pnpm install
```

Create local environment files from the committed templates:

```sh
cp apps/backend/.env.example apps/backend/.env.local
cp apps/agent/.env.example apps/agent/.env.local
cp apps/web/.env.example apps/web/.env.local
```

Fill in the required provider keys and generate private values for
`BETTER_AUTH_SECRET` and `API_TOKEN`. The backend and Agent must use the same
`API_TOKEN`. Never commit `.env.local` files.

Start the local infrastructure, web application, API, and worker:

```sh
pnpm run dev:full
```

Run the voice Agent in a separate terminal:

```sh
pnpm run dev:agent
```

The default local services are:

| Service | Address |
| --- | --- |
| Web | `http://localhost:5173` |
| API | `http://localhost:3001` |
| LiveKit | `ws://localhost:7880` |
| Redis | `redis://localhost:6379` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |

To run the Agent in Docker instead:

```sh
pnpm run dev:agent:docker
```

## Shared practice environment

For persistent data across computers, configure the ignored backend and Agent
environment files with:

- a Turso database and authentication token
- an Upstash TLS Redis URL
- a private Cloudflare R2 bucket and bucket-scoped S3 credentials
- a LiveKit Cloud project
- OpenAI, Qwen, DeepSeek, Deepgram, and Cartesia API credentials

Local practice and the deployed application can use the same cloud resources and
model configuration. Local feature development can continue using the Docker
services.

See [Personal practice deployment](docs/deployment.md) for the complete
environment-variable and deployment checklist.

## Useful commands

```sh
pnpm run dev:full             # infrastructure + web + API + worker
pnpm run dev:agent            # local LiveKit Agent
pnpm run infra:up             # start Docker infrastructure
pnpm run infra:down           # stop Docker infrastructure
pnpm run build                # build all affected workspace packages
pnpm run test                 # run tests
pnpm run lint                 # run workspace lint tasks
pnpm run format-and-lint      # check formatting and linting
pnpm run format-and-lint:fix  # apply safe formatting and lint fixes
pnpm run db:generate          # generate database migrations
pnpm run db:push              # push the database schema
```

Before committing, run:

```sh
pnpm run format-and-lint:fix
pnpm run build
pnpm run test
```

## Deployment

The intended personal deployment is:

| Component | Platform |
| --- | --- |
| Web | Vercel |
| API and worker | Fly.io |
| Voice Agent | LiveKit Cloud |
| Database | Turso |
| Redis and job queue | Upstash |
| Object storage | Cloudflare R2 |

Pull requests run formatting, affected builds, linting, and tests. After a change
is merged to `main`, GitHub Actions deploys only the services affected by that
change. Vercel independently skips web deployments when the web application and
its workspace dependencies are unaffected.

The deployed website discourages search-engine indexing, but that is not access
control. Anyone who knows the URL may still be able to reach it.

## Security

- Keep all `.env.local` and cloud credentials out of Git.
- Scope the R2 API token to the practice bucket.
- Use TLS (`rediss://`) for Upstash.
- Use the same strong `API_TOKEN` only where backend-to-Agent access requires it.
- Rotate any credential that is accidentally printed, shared, or committed.

