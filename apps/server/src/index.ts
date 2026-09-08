import 'dotenv/config';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { startServer } from './server.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

const { httpServer, shutdown } = startServer(config, logger);

httpServer.listen(config.port, () => {
  logger.info(`Math Tug of War server listening on :${config.port}`, {
    env: config.nodeEnv,
    cors: config.corsOrigins,
  });
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down`);
    void shutdown().then(() => process.exit(0));
  });
}
