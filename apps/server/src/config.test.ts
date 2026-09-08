import { describe, expect, it } from 'vitest';
import { corsOriginCheck, isOriginAllowed, loadConfig } from './config.js';

/**
 * Origin policy.
 *
 * When the client and the server are hosted separately, this is the only thing
 * standing between a working classroom and a browser silently refusing every
 * socket. It is also the one setting most likely to be edited under pressure
 * during a deployment, so the behaviour is pinned rather than inferred.
 */

/** Runs the `cors`-style callback synchronously and returns the decision. */
function allows(allowed: string[] | true, origin: string | undefined): boolean {
  let result: boolean | undefined;
  corsOriginCheck(allowed)(origin, (_err, allow) => {
    result = allow;
  });
  return result === true;
}

describe('isOriginAllowed', () => {
  it('accepts an exact match and nothing adjacent to it', () => {
    const allowed = ['https://brain-tug.vercel.app'];

    expect(isOriginAllowed(allowed, 'https://brain-tug.vercel.app')).toBe(true);
    expect(isOriginAllowed(allowed, 'http://brain-tug.vercel.app')).toBe(false);
    expect(isOriginAllowed(allowed, 'https://brain-tug.vercel.app.evil.com')).toBe(false);
    expect(isOriginAllowed(allowed, 'https://evil.com')).toBe(false);
  });

  it('accepts any subdomain under a wildcard entry', () => {
    const allowed = ['https://*.vercel.app'];

    // The production domain and a preview deployment.
    expect(isOriginAllowed(allowed, 'https://brain-tug.vercel.app')).toBe(true);
    // Preview names carry several labels, so the wildcard has to span dots.
    expect(
      isOriginAllowed(allowed, 'https://brain-tug-git-fix-abc123-mohammad.vercel.app'),
    ).toBe(true);
  });

  it('holds the scheme and the suffix boundary under a wildcard', () => {
    const allowed = ['https://*.vercel.app'];

    // Downgrading to http is not covered by an https wildcard.
    expect(isOriginAllowed(allowed, 'http://brain-tug.vercel.app')).toBe(false);
    // A lookalike registered elsewhere must not slip through on a suffix that
    // is not preceded by a dot.
    expect(isOriginAllowed(allowed, 'https://notvercel.app')).toBe(false);
    expect(isOriginAllowed(allowed, 'https://vercel.app.evil.com')).toBe(false);
    expect(isOriginAllowed(allowed, 'https://evil.com')).toBe(false);
  });

  it('honours several entries at once', () => {
    const allowed = ['https://brain-tug.vercel.app', 'https://*.preview.example', 'http://localhost:5173'];

    expect(isOriginAllowed(allowed, 'https://brain-tug.vercel.app')).toBe(true);
    expect(isOriginAllowed(allowed, 'https://x.preview.example')).toBe(true);
    expect(isOriginAllowed(allowed, 'http://localhost:5173')).toBe(true);
    expect(isOriginAllowed(allowed, 'https://somewhere.else')).toBe(false);
  });

  it('allows everything only when explicitly opened up', () => {
    expect(isOriginAllowed(true, 'https://anything.at.all')).toBe(true);
  });

  it('refuses every origin when the list is empty', () => {
    // An empty list is a misconfiguration, but it should fail closed rather
    // than silently behaving like `*`.
    expect(isOriginAllowed([], 'https://brain-tug.vercel.app')).toBe(false);
  });
});

describe('corsOriginCheck', () => {
  it('permits requests that carry no origin at all', () => {
    // Health probes and curl send no `Origin`. Denying them would fail the
    // platform's readiness check and take the service down.
    expect(allows(['https://brain-tug.vercel.app'], undefined)).toBe(true);
  });

  it('denies a disallowed origin rather than erroring', () => {
    expect(allows(['https://brain-tug.vercel.app'], 'https://evil.com')).toBe(false);
  });
});

describe('loadConfig', () => {
  it('splits a comma-separated origin list and trims it', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGIN: 'https://brain-tug.vercel.app, https://*.vercel.app ',
    } as NodeJS.ProcessEnv);

    expect(config.corsOrigins).toEqual(['https://brain-tug.vercel.app', 'https://*.vercel.app']);
  });

  it('treats a bare star as open', () => {
    const config = loadConfig({ NODE_ENV: 'test', CORS_ORIGIN: '*' } as NodeJS.ProcessEnv);
    expect(config.corsOrigins).toBe(true);
  });

  it('serves no client unless a dist directory is named', () => {
    expect(loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).clientDist).toBeNull();
    expect(
      loadConfig({ NODE_ENV: 'test', CLIENT_DIST: 'apps/web/dist' } as NodeJS.ProcessEnv)
        .clientDist,
    ).toBe('apps/web/dist');
  });
});
