import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(2 * 60 * 60 * 1000),
  /**
   * Directory of built client assets to serve. Set in a single-origin
   * deployment; left unset when the client is served separately by a CDN or by
   * the Vite dev server.
   */
  CLIENT_DIST: z.string().optional(),
});

export type ServerConfig = {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  /** `true` allows any origin; only reachable by setting CORS_ORIGIN=*. */
  corsOrigins: string[] | true;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sessionTtlMs: number;
  /** Absolute or relative path to the built client, or null to serve none. */
  clientDist: string | null;
};

/**
 * Whether an origin is permitted, supporting a leading `*.` wildcard on the
 * host.
 *
 * Exact matching alone is impractical when the client is on a platform that
 * mints a fresh domain per preview deployment: every preview would be blocked,
 * and nobody can list domains that do not exist yet. A wildcard entry such as
 * `https://*.vercel.app` covers them.
 *
 * The wildcard deliberately spans dots, so it also matches the multi-label
 * names those platforms generate. That makes it a broad grant, which is why it
 * belongs in a preview configuration and not in the production one: an entry
 * like `https://*.vercel.app` trusts anything anyone hosts on that platform.
 */
export function isOriginAllowed(allowed: string[] | true, origin: string): boolean {
  if (allowed === true) return true;

  return allowed.some((entry) => {
    if (entry === origin) return true;
    if (!entry.includes('*')) return false;

    const [scheme, host] = entry.split('://');
    if (!scheme || !host?.startsWith('*.')) return false;

    const suffix = host.slice(1); // ".vercel.app"
    const [originScheme, originHost] = origin.split('://');
    return originScheme === scheme && !!originHost?.endsWith(suffix);
  });
}

/**
 * Builds the origin check in the shape the `cors` package wants, which is also
 * what Socket.IO passes straight through to it.
 */
export function corsOriginCheck(
  allowed: string[] | true,
): (origin: string | undefined, done: (err: Error | null, allow?: boolean) => void) => void {
  return (origin, done) => {
    // No `Origin` header means a same-origin or non-browser request, such as a
    // health probe. There is nothing to deny.
    if (!origin) return done(null, true);
    done(null, isOriginAllowed(allowed, origin));
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  const raw = parsed.data;
  const origins = raw.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
    corsOrigins: origins.includes('*') ? true : origins,
    logLevel: raw.LOG_LEVEL,
    sessionTtlMs: raw.SESSION_TTL_MS,
    clientDist: raw.CLIENT_DIST ?? null,
  };
}
