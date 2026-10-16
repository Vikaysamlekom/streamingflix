import { pino } from 'pino';
import { env, isProduction } from '../config/env';

/**
 * Logger terstruktur (Pino) dengan redaksi data rahasia.
 * Password, token, cookie, dan kredensial tidak pernah masuk log.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'password',
      'password_hash',
      'passwordHash',
      'token',
      'csrfToken',
      'secret',
      'SESSION_SECRET',
      'DB_PASSWORD',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  base: {
    service: 'streamflix-api',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname,service',
          singleLine: false,
        },
      },
});
