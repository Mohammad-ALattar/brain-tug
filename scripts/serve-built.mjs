import { fileURLToPath } from 'node:url';

/**
 * Boots the built server with the built client attached, on one origin.
 *
 * This is the shape a real deployment runs in, which is the point: the
 * end-to-end suite exercises the same single-origin setup a school would use
 * rather than a dev-only two-port arrangement that hides CORS and routing bugs.
 *
 * Env vars are set here instead of inline in an npm script so the command works
 * identically on Windows and POSIX without pulling in `cross-env`.
 */
process.env.NODE_ENV ??= 'production';
process.env.PORT ??= '4321';
process.env.LOG_LEVEL ??= 'warn';
process.env.CORS_ORIGIN ??= '*';
process.env.CLIENT_DIST ??= fileURLToPath(new URL('../apps/web/dist', import.meta.url));

await import('../apps/server/dist/index.js');
