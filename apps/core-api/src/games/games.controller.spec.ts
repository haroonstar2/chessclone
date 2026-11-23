import { jest } from '@jest/globals';
import type { Request } from 'express';

import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { PaginatedMatchHistoryResponse } from './dto/match-history.dto.js';

describe('GamesController', () => {
  let gamesController: GamesController;

  const emptyHistory: PaginatedMatchHistoryResponse = {
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  };

  const gamesServiceMock = {
    getMatchHistory:
      jest.fn<
        (
          userUuid: string,
          page?: number,
          limit?: number,
        ) => Promise<PaginatedMatchHistoryResponse>
      >(),
  };

  beforeEach(async () => {
    gamesServiceMock.getMatchHistory.mockReset();
    gamesServiceMock.getMatchHistory.mockResolvedValue(emptyHistory);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: gamesServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gamesController = module.get<GamesController>(GamesController);
  });

  describe('getMatchHistory', () => {
    it('queries history for the authenticated user (req.user.sub)', async () => {
      const req = { user: { sub: 'user-uuid' } } as Request & {
        user: { sub: string };
      };

      const result = await gamesController.getMatchHistory(req, {
        page: 2,
        limit: 5,
      });

      expect(gamesServiceMock.getMatchHistory).toHaveBeenCalledWith(
        'user-uuid',
        2,
        5,
      );
      expect(result).toBe(emptyHistory);
    });
  });
});
