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
and `X-Robots-Tag`. This is not access control.

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
