import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let mockPrisma: { game: { create: jest.Mock } };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    rpop: jest.Mock;
    lpush: jest.Mock;
    lrem: jest.Mock;
  };

  const gameUuid = 'game-uuid-1234';

  beforeEach(async () => {
    mockPrisma = {
      game: {
        create: jest.fn().mockResolvedValue({ uuid: gameUuid }),
      },
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      rpop: jest.fn(),
      lpush: jest.fn(),
      lrem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(MatchmakingService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('join', () => {
    it('should push the user and return QUEUED when the queue is empty', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.rpop.mockResolvedValue(null);

      const result = await service.join('user-1', '5m');

      expect(result).toEqual({ status: 'QUEUED' });
      expect(mockRedis.lrem).toHaveBeenCalledWith(
        'queue:matchmaking:5m',
        0,
        'user-1',
      );
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:matchmaking:5m',
        'user-1',
      );
      expect(mockPrisma.game.create).not.toHaveBeenCalled();
    });

    it('should pop the opponent, create a Game, set the opponent notification key, and return MATCHED', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.rpop.mockResolvedValue('user-2');

      const result = await service.join('user-1', '10m');

      expect(result.status).toBe('MATCHED');
      expect(result.gameId).toBe(gameUuid);

      expect(mockPrisma.game.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.game.create.mock.calls[0][0];
      expect(createCall.data.white_player_id).toBeDefined();
      expect(createCall.data.black_player_id).toBeDefined();
      expect(createCall.data.status).toBe('ACTIVE');
      expect(
        [createCall.data.white_player_id, createCall.data.black_player_id],
      ).toEqual(expect.arrayContaining(['user-1', 'user-2']));

      expect(mockRedis.set).toHaveBeenCalledWith(
        'match:user:user-2',
        gameUuid,
        'EX',
        60,
      );
    });

    it('should not match a user against themselves', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.rpop.mockResolvedValue('user-1');

      const result = await service.join('user-1', '5m');

      expect(result).toEqual({ status: 'QUEUED' });
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:matchmaking:5m',
        'user-1',
      );
      expect(mockPrisma.game.create).not.toHaveBeenCalled();
    });

    it('should return MATCHED immediately if the user already has a pending match key', async () => {
      mockRedis.get.mockResolvedValue('existing-game-id');

      const result = await service.join('user-1', '5m');

      expect(result).toEqual({ status: 'MATCHED', gameId: 'existing-game-id' });
      expect(mockRedis.rpop).not.toHaveBeenCalled();
      expect(mockPrisma.game.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return MATCHED and delete the key when a match is found', async () => {
      mockRedis.get.mockResolvedValue('game-abc');

      const result = await service.getStatus('user-1');

      expect(result).toEqual({ status: 'MATCHED', gameId: 'game-abc' });
      expect(mockRedis.del).toHaveBeenCalledWith('match:user:user-1');
    });

    it('should return WAITING when no match key exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result).toEqual({ status: 'WAITING' });
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('should remove the user from the queue', async () => {
      await service.leave('user-1', '5m');

      expect(mockRedis.lrem).toHaveBeenCalledWith(
        'queue:matchmaking:5m',
        0,
        'user-1',
      );
    });
  });
});
