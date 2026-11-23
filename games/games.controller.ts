import { Controller, Get, Query, Req } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { GetMatchHistoryDto, PaginatedMatchHistoryResponse } from './dto/match-history.dto';

@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('games/history')
  async getMatchHistory(
    @Req() req,
    @Query() query: GetMatchHistoryDto,
  ): Promise<PaginatedMatchHistoryResponse> {
    const { page, limit } = query;
    return this.gamesService.getMatchHistory(req.user.uuid, page, limit);
  }
}
