import { createServer, type Server as HttpServer } from 'node:http';
import { join, resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import type { ServerConfig } from './config.js';
import type { Logger } from './logger.js';
import { attachGateway, type Gateway } from './realtime/gateway.js';

export type RunningServer = {
  httpServer: HttpServer;
  gateway: Gateway;
  shutdown: () => Promise<void>;
};

/** Builds the HTTP surface and attaches the realtime gateway to it. */
export function startServer(config: ServerConfig, logger: Logger): RunningServer {
  const app = express();

  app.use(cors({ origin: config.corsOrigins === true ? true : config.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  const httpServer = createServer(app);
  const gateway = attachGateway(httpServer, config, logger);

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      env: config.nodeEnv,
      uptime: process.uptime(),
      games: gateway.store.size(),
    });
  });

  // Single-origin deployment: the same process serves the client, which removes
  // the CORS surface entirely and means the room code URL a teacher writes on
  // the board has no separate host to get wrong.
  if (config.clientDist) {
    const dist = resolve(config.clientDist);
    // Hashed asset filenames are safe to cache hard; `index.html` must not be,
    // or a deploy leaves classrooms on the previous build.
    app.use(
      express.static(dist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
          else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    // Client-side routing: every non-API path renders the SPA shell, so a
    // student opening /play/ABC123 directly gets the app rather than a 404.
    app.get(/^(?!\/(health|socket\.io)).*/, (_req, res) => {
      res.sendFile(join(dist, 'index.html'));
    });
    logger.info('Serving client assets', { dist });
  }

  const shutdown = async (): Promise<void> => {
    await gateway.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    logger.info('Server closed');
  };

  return { httpServer, gateway, shutdown };
}
