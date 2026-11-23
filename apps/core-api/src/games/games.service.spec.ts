import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { GamesService } from './games.service.js';

import { PrismaService } from '../prisma/prisma.service.js';

describe('GamesService', () => {
  let service: GamesService;

  let prismaService: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn<() => Promise<unknown>>(),

    game: {
      findMany: jest.fn(),

      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,

        {
          provide: PrismaService,

          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);

    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMatchHistory', () => {
    const userUuid = 'user-uuid';

    const page = 2;

    const limit = 10;

    const mockGames = [
      {
        uuid: 'game-1',

        createdAt: new Date('2023-01-01'),

        result: 'WHITE_WINS',

        pgn: null,

        whitePlayer: {
          uuid: userUuid,

          username: 'player1',

          currentRating: 1200,
        },

        blackPlayer: {
          uuid: 'opponent-uuid',

          username: 'opponent1',

          currentRating: 1300,
        },
      },

      {
        uuid: 'game-2',

        createdAt: new Date('2023-01-02'),

        result: 'BLACK_WINS',

        pgn: null,

        whitePlayer: {
          uuid: 'opponent-uuid-2',

          username: 'opponent2',

          currentRating: 1400,
        },

        blackPlayer: {
          uuid: userUuid,

          username: 'player1',

          currentRating: 1200,
        },
      },
    ];

    const mockTotal = 25;

    beforeEach(() => {
      (mockPrisma.$transaction as jest.MockedFunction<
        () => Promise<unknown>
      >).mockResolvedValue([
        mockGames,
        mockTotal,
      ]);
    });

    it('should calculate pagination correctly', async () => {
      const result = await service.getMatchHistory(userUuid, page, limit);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        expect.anything(), // findMany call

        expect.anything(), // count call
      ]);

      expect(result.meta.total).toBe(mockTotal);

      expect(result.meta.page).toBe(page);

      expect(result.meta.limit).toBe(limit);

      expect(result.meta.totalPages).toBe(3); // 25 / 10 = 2.5 -> ceil = 3
    });

    it('should map outcomes correctly for white player', async () => {
      const result = await service.getMatchHistory(userUuid, page, limit);

      expect(result.data[0].playerColor).toBe('white');

      expect(result.data[0].outcome).toBe('WIN'); // WHITE_WINS -> WIN

      expect(result.data[1].playerColor).toBe('white');

      expect(result.data[1].outcome).toBe('LOSS'); // BLACK_WINS -> LOSS
    });

    it('should map outcomes correctly for black player', async () => {
      const result = await service.getMatchHistory(userUuid, page, limit);

      expect(result.data[0].playerColor).toBe('white');

      expect(result.data[0].outcome).toBe('WIN'); // WHITE_WINS -> WIN

      expect(result.data[1].playerColor).toBe('white');

      expect(result.data[1].outcome).toBe('LOSS'); // BLACK_WINS -> LOSS
    });

    it('should populate opponent details correctly', async () => {
      const result = await service.getMatchHistory(userUuid, page, limit);

      expect(result.data[0].opponent.uuid).toBe('opponent-uuid');

      expect(result.data[0].opponent.username).toBe('opponent1');

      expect(result.data[0].opponent.rating).toBe(1300);

      expect(result.data[1].opponent.uuid).toBe('opponent-uuid-2');

      expect(result.data[1].opponent.username).toBe('opponent2');

      expect(result.data[1].opponent.rating).toBe(1400);
    });
  });
});
