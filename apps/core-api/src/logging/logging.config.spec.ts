import { Writable } from 'node:stream';
import { pino } from 'pino';
import type { IncomingMessage } from 'node:http';
import { loggingOptions, traceFields } from './logging.config.js';

it('writes JSON with trace fields and excludes HTTP credentials', () => {
  let output = '';
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  const logger = pino(loggingOptions, stream);
  logger.info(
    {
      userId: 'user-1',
      gameId: 'game-1',
      req: {
        method: 'GET',
        url: '/auth/ticket?ticket=secret',
        headers: { authorization: 'Bearer secret' },
        body: { password: 'secret' },
      },
    },
    'Request finished',
  );

  const record = JSON.parse(output) as {
    userId: string;
    gameId: string;
    timestamp: string;
    req: { url: string };
  };
  expect(record.userId).toBe('user-1');
  expect(record.gameId).toBe('game-1');
  expect(record.timestamp).toEqual(expect.any(String));
  expect(record.req.url).toBe('/auth/ticket');
  expect(output).not.toContain('secret');
});

it('uses the verified user identity', () => {
  const request = {
    user: { sub: 'verified-user' },
    params: { gameId: 'game-1' },
  } as unknown as IncomingMessage;

  expect(traceFields(request)).toEqual({
    userId: 'verified-user',
    gameId: 'game-1',
  });
});
