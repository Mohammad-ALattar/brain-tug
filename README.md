# Math Tug of War

A real-time classroom game. Two teams answer arithmetic problems on their phones;
each correct answer pulls a rope on a shared display at the front of the room.

Three screens, one match:

| Screen                | Route            | Who uses it                            |
| --------------------- | ---------------- | -------------------------------------- |
| **Classroom arena**   | `/arena/:code`   | Projector or TV, read-only by default  |
| **Student pad**       | `/play/:code`    | One phone or tablet per child          |
| **Teacher dashboard** | `/host`          | The teacher's laptop or phone          |

## Running it locally

```bash
npm install
npm run dev
```

That starts the shared package in watch mode, the game server on `:3001` and the
client on `:5173`. Open `/host` to create a match, put the room code on the
board, open `/arena/<code>` on the projector, and send students to `/play/<code>`.

## How it is put together

```
packages/shared    Domain core: rules, question generation, scoring, rope maths,
                   and the pure reducers that decide every outcome. No React,
                   no sockets, no Express.
apps/server        Socket.IO gateway, session store and timers. The only
                   authority on game state.
apps/web           All three screens, sharing one Zustand store.
e2e                Playwright suite driving all three roles at once.
```

Two rules hold the design together:

**The server is the only source of truth.** Clients render what they are told.
Correct answers never travel to the browser, so a child with dev tools open sees
the same thing as a child without. The server validates every payload at the
socket boundary with zod and authorises host actions against a token.

**Motion never passes through React.** The rope, the characters and the tension
glow are driven by CSS custom properties written imperatively from a store
subscription, so a match running for an hour on a projector does no render work
to animate. `apps/web/src/features/arena/rerender.test.tsx` pins the budgets
that keep it that way.

## Testing

```bash
npm test           # unit and integration: domain, server gateway, components
npm run test:load  # 40 simulated students against a real server
npm run e2e        # builds, then drives all three roles in a real browser
npm run lint
npm run typecheck
```

The load suite is worth knowing about: it fills a room with forty concurrent
sockets and checks the behaviours that only break at classroom scale, such as a
whole team submitting the same answer in one tick, or a third of the class
dropping off mid-round.

## Deploying

See [DEPLOY.md](./DEPLOY.md). The short version: the server holds game state in
memory and drives round timers itself, so it needs a host that keeps a process
alive. Serverless platforms cannot run it, though they are fine for the client —
`npm run build:web` builds the client alone for exactly that.
