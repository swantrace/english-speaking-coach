# Personal practice deployment

The project has two data environments:

- `development`: local SQLite/MinIO/Redis for feature work.
- `practice`: shared Turso/Cloudflare R2/Upstash data used by both the local
  practice runtime and the deployed runtime.

AI provider keys and model route variables deliberately keep the same names in
both environments. Copy the same values where you want identical behavior.

## Shared practice services

Create:

1. A Turso database and token.
2. An Upstash Redis database.
3. A private Cloudflare R2 bucket and an R2 S3 API token scoped to that bucket.
4. A LiveKit Cloud project.

Use the values documented in `apps/backend/.env.example`. For R2, use
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`, and
`S3_FORCE_PATH_STYLE=false`.

For local practice, put the shared cloud values in the ignored
`apps/backend/.env.local` and `apps/agent/.env.local`. Do not commit credentials.

## Web on Vercel

Set the Vercel Root Directory to `apps/web`. Leave `VITE_API_BASE_URL` unset so
the browser uses `/api`; `vercel.json` proxies it to Fly and supplies the SPA
fallback. Search indexing is discouraged using `robots.txt`, a robots meta tag,
and `X-Robots-Tag`. This is not access control. The checked-in `ignoreCommand`
uses `turbo query affected`, so Vercel skips deployments when neither `web` nor
one of its workspace dependencies changed.

## API and worker on Fly

Deploy from the repository root:

```sh
fly deploy --config apps/backend/fly.toml .
```

Set the secrets listed in `apps/backend/.env.example`, including:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
REDIS_URL
S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY
BETTER_AUTH_URL=https://english-speacking-coach.vercel.app
AUTH_TRUSTED_ORIGINS=https://english-speacking-coach.vercel.app
BETTER_AUTH_SECRET
API_TOKEN
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
OPENAI_API_KEY
QWEN_API_KEY
DEEPSEEK_API_KEY
```

The API and BullMQ worker run in one Fly Machine. A stopped Machine automatically
starts on an HTTP request and deliberately does not automatically stop, because
Fly's HTTP idle detection cannot know whether the background worker is busy.
After practice, find and stop (do not destroy) the Machine:

```sh
fly machine list --app english-speaking-coach
fly machine stop <MACHINE_ID> --app english-speaking-coach
```

The next request through the Vercel site wakes that stopped Machine. If you scale
the app to zero or destroy its only Machine, create one again before relying on
automatic startup.

## LiveKit Cloud Agent

The repository-root `Dockerfile` is the LiveKit Cloud Agent image (Fly explicitly
uses the backend Dockerfile). From the repository root, create the Agent once,
then use the generated Agent ID for later deploys:

```sh
lk agent create .
lk agent deploy .
```

Set `BACKEND_BASE_URL=https://english-speaking-coach.fly.dev` and use the same
`API_TOKEN`, Redis URL, LiveKit credentials, and voice-model provider keys as
the backend/practice environment. LiveKit Cloud does not upload `.env*` files;
configure secrets in the LiveKit deployment instead.

## GitHub CI/CD

`.github/workflows/pipeline.yml` runs on pull requests and pushes to `main`.
It formats-checks the whole repository, then uses Turborepo's affected package
graph for builds, lint, and tests. On `main`, Fly and LiveKit deploy only when
their application package or a workspace dependency changed. Documentation-only
changes do not deploy services.

The workflow can also be started manually with `ci-only`, `fly`, `livekit`, or
`all`. Configure a GitHub `production` environment and add:

- `FLY_API_TOKEN`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_SECRET_LIST`

`LIVEKIT_AGENT_SECRET_LIST` contains the runtime secrets passed to the official
LiveKit deployment action. LiveKit supplies its own `LIVEKIT_*` credentials to
the deployed Agent.

The workflow caches `.turbo` with GitHub Actions. GitHub caches are scoped by
branch, so optionally configure Vercel Remote Cache to share task artifacts
between PR branches and `main`:

- Actions secret: `TURBO_TOKEN`
- Actions variable: `TURBO_TEAM`

Without these optional values, the branch-local `.turbo` cache still works.

Protect `main` with a GitHub branch ruleset:

1. Go to **Settings → Rules → Rulesets** and create a branch ruleset for `main`.
2. Enable **Require a pull request before merging**.
3. Require the `Quality and affected services` status check.
4. Block force pushes and branch deletion.
5. For this personal repository, required approvals can remain at zero.

Before automatic LiveKit deployments can run, create the Agent once locally and
commit the generated root `livekit.toml`:

```sh
lk agent create .
git add livekit.toml
```
