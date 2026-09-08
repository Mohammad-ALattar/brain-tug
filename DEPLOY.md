# Deploying Math Tug of War

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
