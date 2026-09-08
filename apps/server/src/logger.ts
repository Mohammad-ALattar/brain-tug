const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export type LogLevel = keyof typeof LEVELS;

export type Logger = {
  debug(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
};

export function createLogger(level: LogLevel): Logger {
  const min = LEVELS[level];
  const emit = (lvl: LogLevel, msg: string, meta?: unknown): void => {
    if (LEVELS[lvl] < min) return;
    const line = `[${new Date().toISOString()}] ${lvl.toUpperCase().padEnd(5)} ${msg}`;
    const stream = LEVELS[lvl] >= LEVELS.warn ? console.error : console.log;
    if (meta === undefined) stream(line);
    else stream(line, meta);
  };

  return {
    debug: (m, x) => emit('debug', m, x),
    info: (m, x) => emit('info', m, x),
    warn: (m, x) => emit('warn', m, x),
    error: (m, x) => emit('error', m, x),
  };
}
