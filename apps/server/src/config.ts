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
