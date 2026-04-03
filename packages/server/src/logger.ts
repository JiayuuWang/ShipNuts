const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
};

function timestamp(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export function createLogger(module: string): Logger {
  const tag = `[${module}]`;

  return {
    info: (...args) =>
      console.log(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.green}INFO ${COLORS.reset} ${COLORS.cyan}${tag}${COLORS.reset}`, ...args),
    warn: (...args) =>
      console.warn(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.yellow}WARN ${COLORS.reset} ${COLORS.cyan}${tag}${COLORS.reset}`, ...args),
    error: (...args) =>
      console.error(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.red}ERROR${COLORS.reset} ${COLORS.cyan}${tag}${COLORS.reset}`, ...args),
    debug: (...args) =>
      console.debug(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.magenta}DEBUG${COLORS.reset} ${COLORS.cyan}${tag}${COLORS.reset}`, ...args),
  };
}
