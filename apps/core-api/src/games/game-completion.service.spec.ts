import { jest } from '@jest/globals';
import { GameCompletionService } from './game-completion.service.js';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const event = {
  type: 'GAME_COMPLETED',
  payload: {
    gameId: 'game',
    whitePlayerId: 'white',
    blackPlayerId: 'black',
    pgn: '[Result "0-1"]\n\n0-1',
    winner: 'black',
    result: '0-1',
  },
};

describe('GameCompletionService', () => {
  const upsert = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const hdel = jest.fn<(...args: unknown[]) => Promise<number>>();
  const redis = { getClient: () => ({ hdel }) } as unknown as RedisService;

  let service: GameCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    upsert.mockResolvedValue({});
    hdel.mockResolvedValue(1);
    service = new GameCompletionService(redis, {
      game: { upsert },
    } as unknown as PrismaService);
  });

  it('stores final PGN and result by game ID before acknowledging', async () => {
    await service.consume(JSON.stringify(event));

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: 'game' },
        create: expect.objectContaining({
          status: 'COMPLETED',
          result: 'BLACK_WINS',
          pgn: event.payload.pgn,
          white_player_id: 'white',
          black_player_id: 'black',
        }),
      }),
    );

    expect(hdel).toHaveBeenCalledWith('games:completed:pending', 'game');
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(
      hdel.mock.invocationCallOrder[0],
    );
  });

  it('keeps failed writes pending for retry', async () => {
    upsert.mockRejectedValue(new Error('database offline'));
    await service.consume(JSON.stringify(event));
    expect(hdel).not.toHaveBeenCalled();
  });

  it('ignores malformed events', async () => {
    await service.consume('{');
    await service.consume(
      JSON.stringify({
        ...event,
        payload: { ...event.payload, winner: 'white' },
      }),
    );

    expect(upsert).not.toHaveBeenCalled();
  });

  it('maps draws without a winner', async () => {
    await service.consume(
      JSON.stringify({
        ...event,
        payload: { ...event.payload, result: '1/2-1/2', winner: null },
      }),
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ result: 'DRAW' }),
      }),
    );
  });
});

it('subscribes on a dedicated connection, replays pending events, and closes it', async () => {
  const upsert = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({});

  const subscriber = {
    on: jest.fn(),
    subscribe: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    quit: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
  };

  const client = {
    duplicate: () => subscriber,
    hgetall: jest
      .fn<() => Promise<Record<string, string>>>()
      .mockResolvedValue({ game: JSON.stringify(event) }),
    hdel: jest.fn<() => Promise<number>>().mockResolvedValue(1),
  };

  const service = new GameCompletionService(
    { getClient: () => client } as unknown as RedisService,
    { game: { upsert } } as unknown as PrismaService,
  );

  await service.onApplicationBootstrap();

  expect(subscriber.subscribe).toHaveBeenCalledWith('game:completed');
  expect(upsert).toHaveBeenCalledTimes(1);

  const listener = subscriber.on.mock.calls.find(
    (call) => call[0] === 'message',
  )![1] as (channel: string, message: string) => void;

  listener('game:completed', JSON.stringify(event));

  await service.onModuleDestroy();

  expect(upsert).toHaveBeenCalledTimes(2);
  expect(subscriber.quit).toHaveBeenCalledTimes(1);
});
