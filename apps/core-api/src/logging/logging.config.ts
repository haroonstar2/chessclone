import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request } from 'express';
import type { Options } from 'pino-http';

// Extracts trace fields (userId and gameId) from the incoming request for logging purposes.
export function traceFields(request: IncomingMessage) {
  const req = request as Request & { user?: { sub?: string } };
  let userId = '';
  let gameId = '';

  if (typeof req.user?.sub === 'string') {
    userId = req.user.sub;
  }

  if (typeof req.params?.gameId === 'string') {
    gameId = req.params.gameId;
  }

  return { userId, gameId };
}

// Configuration options for the pino-http logger
export const loggingOptions: Options = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  mixin: (_context, _level, logger) => {
    const bindings = logger.bindings();
    const defaults: Record<string, string> = {};

    if (!('userId' in bindings)) {
      defaults.userId = '';
    }

    if (!('gameId' in bindings)) {
      defaults.gameId = '';
    }

    return defaults;
  },
  genReqId: () => randomUUID(),

  // Never serialize bodies, headers, or query strings containing credentials.
  serializers: {
    req: (req: IncomingMessage) => ({
      id: req.id,
      method: req.method,
      url: req.url?.split('?')[0],
    }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },

  customSuccessObject: (req, _res, value: Record<string, unknown>) => ({
    ...value,
    ...traceFields(req),
  }),

  customErrorObject: (req, _res, _error, value: Record<string, unknown>) => ({
    ...value,
    ...traceFields(req),
  }),
};
