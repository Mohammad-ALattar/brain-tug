# Deploying Brain Tug

## The short version

```bash
npm ci
npm run build
CLIENT_DIST=apps/web/dist NODE_ENV=production PORT=8080 npm start
```

One Node process now serves the client and the websocket on the same port.

## Why single-origin

The server will serve the built client itself when `CLIENT_DIST` is set, and that
is the recommended shape. It removes the CORS surface entirely, and it means the
URL a teacher writes on the whiteboard has exactly one host in it. Splitting the
client onto a CDN works, but then you own two more things: a correct
`CORS_ORIGIN` list, and a `VITE_SERVER_URL` baked into the client at build time
that must keep matching where the server actually lives.

Asset caching is already handled: hashed filenames are served `immutable` for a
year, and `index.html` is served `no-cache` so a deploy does not leave a
classroom running yesterday's build until someone hard-refreshes.

## Vercel, and why the server does not belong there

Vercel builds the **client only**. Point the project's **Root Directory** at
`apps/web`; from there Vercel runs that workspace's own `build` script and never
looks at `apps/server`. `apps/web/vercel.json` pins the Vite preset and adds a
rewrite so `/play/ABC123` gets the SPA shell instead of a 404.

Both workspaces build with `tsc --build` rather than `tsc -p`, so each one
compiles the `packages/shared` project reference it depends on. That is what
lets `apps/web` build in isolation, with no root orchestration step and no
dependency on the server ever being compiled.

Getting the Root Directory wrong is what produced
`Missing script: "build:web"` with `location /vercel/path0/apps/server`: the
build command was resolving against the server workspace. Adding that script to
`apps/server` would have silenced the error and then built the wrong thing,
because the server cannot usefully run on Vercel at all.

Vercel added WebSocket support on Fluid Compute, so the connection itself would
work. Three properties of that model break this particular server:

- **Instances are paused between work and any instance may take a connection.**
  Game state lives in memory in `SessionStore`, keyed by room code. Half a
  classroom would land on an instance that has never heard of their match.
- **Round timing is server-side.** `TimerService` holds a real timer per round to
  close the question and start the next one. A paused instance does not fire it,
  so the game stops advancing while the clock on screen keeps running.
- **A connection lives at most as long as the function's duration limit.** A
  match runs for a whole lesson.

None of that is a Vercel flaw; a request-scoped, horizontally-scaled runtime is
simply the opposite of what an authoritative game server needs. Reworking the
game to fit would mean moving all state to Redis and driving round transitions
from an external scheduler — a real project, not a config change.

So host the server on something that keeps a process alive: Railway, Render,
Fly.io, or any small VM.

### Wiring the two halves together

On the **server host**:

| Setting | Value                     |
| ------- | ------------------------- |
| Root    | repository root (`/`), not `apps/server` |
| Build   | `npm run build:server`    |
| Start   | `npm run start:server`    |
| Health  | `GET /health`             |

A `railway.toml` at the repo root pins the build and start commands so a stale
dashboard override cannot keep calling the old `@mtow/server` workspace name.
If a deploy still fails with `No workspaces found: --workspace=@mtow/server`,
open Railway **Settings → Build** and clear any custom build command left over
from before the rename to Brain Tug (`@braintug/server`).

Do not chain `npm ci` into the Railway build command. Nixpacks installs
dependencies first; running `npm ci` again tries to delete `node_modules` and
often fails with `EBUSY` on `apps/web/node_modules/.vite`.

Note the asymmetry with Vercel: Railway's root directory stays at the
**repository root**, not `apps/server`, because `npm ci` needs the lockfile and
the workspace definitions that only exist there. The root `build:server` and
`start:server` scripts then target the one workspace.

`build:server` stops after the server, so the host does not spend time building
a client it will never serve. Leave `CLIENT_DIST` unset there — that is what
distinguishes this from the single-origin setup.

Environment on the server host:

```
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
LOG_LEVEL=info
```

`PORT` is normally injected by the platform; the server reads it. Do not set
`CLIENT_DIST`.

On **Vercel**, one environment variable:

```
VITE_SERVER_URL=https://your-server-host
```

It is read at **build time**, not runtime, so changing it needs a redeploy of
the client rather than a restart. Get it wrong and the client tries to open a
socket against the Vercel domain, where nothing is listening — the page renders
fine and simply never connects.

### Preview deployments

Vercel gives every preview a fresh domain, so an exact `CORS_ORIGIN` blocks all
of them. `CORS_ORIGIN` accepts a wildcard on the host for this:

```
CORS_ORIGIN=https://your-app.vercel.app,https://*.vercel.app
```

Be deliberate about that second entry. `https://*.vercel.app` trusts anything
anyone hosts on Vercel, not only your previews. It is a reasonable trade for a
staging server and a poor one for the server a school actually uses — so prefer
listing only the production domain there, and keep the wildcard on a separate
staging deployment.

### Checking it works

Confirm the two halves can actually see each other, from a browser rather than
from curl, because CORS only exists in a browser:

1. Open the Vercel URL and check the network panel for a `socket.io` request
   that upgrades to a websocket rather than failing.
2. A CORS rejection appears as a blocked request mentioning
   `Access-Control-Allow-Origin`; that means `CORS_ORIGIN` does not list the
   domain you are on.
3. A request that never appears at all means `VITE_SERVER_URL` was missing when
   the client was built.

## Environment

Copy `.env.example` and set at minimum:

| Variable          | Production value                | Notes                                                        |
| ----------------- | ------------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`        | `production`                    | Also selects the production React build at bundle time.      |
| `PORT`            | whatever the platform assigns   | Most PaaS providers inject this.                             |
| `CLIENT_DIST`     | `apps/web/dist`                 | Omit only if a CDN serves the client.                        |
| `CORS_ORIGIN`     | your origin, or unset           | Irrelevant when single-origin. Never `*` in production.      |
| `SESSION_TTL_MS`  | `7200000` (2h)                  | How long an abandoned match is kept before it is reaped.      |
| `LOG_LEVEL`       | `info`                          | `debug` logs every socket event and is very noisy at scale.  |

`VITE_SERVER_URL` is a build-time variable, not a runtime one. Leave it unset for
a single-origin deployment and the client will connect to the page origin.

## What the host needs to support

**Websockets.** Socket.IO will fall back to HTTP long-polling, but the game will
feel bad: the rope lags behind the room's reaction. Make sure the proxy in front
of Node is configured to upgrade connections, and raise its idle timeout above a
lesson's length — a class in the lobby sends no traffic for minutes at a time.

**A single instance, or sticky sessions.** Game state lives in memory, keyed by
room code, in `SessionStore`. Two instances behind a round-robin load balancer
will each think they own half the classroom. One instance handles a school
comfortably; if you need more, either pin by room code at the load balancer or
implement `SessionStore` against Redis and add the Socket.IO Redis adapter. The
interface exists for exactly that reason and nothing outside
`apps/server/src/store` assumes the in-memory implementation.

**Sizing.** The heaviest sustained load is the draft firehose: every student's
keystrokes, throttled client-side to roughly one message per 90ms per device. A
forty-student room is a few hundred messages per second, which is unremarkable
for one Node process. `npm run test:load` reproduces it if you want a number
from your own hardware.

## Health and readiness

`GET /health` returns `{ ok, env, uptime, games }`. `games` is the number of live
sessions, which makes it useful as more than a liveness probe: a deploy that
drops it to zero mid-lesson has just ended somebody's lesson.

## Restarts end matches

There is no persistence. Restarting the server discards every in-flight game;
students see a disconnect and the teacher has to create a new match. So deploy
between lessons, and prefer draining to a hard restart. If matches surviving a
restart matters for your setting, that is the Redis-backed `SessionStore` above.

## Verifying a deployment

```bash
curl https://your-host/health
```

Then run one real match end to end: create it on `/host`, open the arena from the
dashboard link, join from a phone on the school wifi rather than from the same
machine, and answer one question. That last part is the one worth not skipping —
it is the only check that exercises the websocket upgrade through the real proxy
from a real network.
