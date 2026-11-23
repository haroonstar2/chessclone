import { Controller, Get, Query, Req } from '@nestjs/common';
import { GamesService } from './games.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { UseGuards } from '@nestjs/common';
import {
  GetMatchHistoryDto,
  PaginatedMatchHistoryResponse,
} from './dto/match-history.dto.js';

@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(AuthGuard)
  @Get('games/history')
  async getMatchHistory(
    @Req() req,
    @Query() query: GetMatchHistoryDto,
  ): Promise<PaginatedMatchHistoryResponse> {
    const { page, limit } = query;
    return this.gamesService.getMatchHistory(req.user.uuid, page, limit);
  }
}
