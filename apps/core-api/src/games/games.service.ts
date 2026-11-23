import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  MatchHistoryItem,
  PaginatedMatchHistoryResponse,
} from './dto/match-history.dto.js';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async getMatchHistory(
    userUuid: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedMatchHistoryResponse> {
    const [games, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where: {
          status: 'COMPLETED',
          OR: [{ white_player_id: userUuid }, { black_player_id: userUuid }],
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          uuid: true,
          created_at: true,
          result: true,
          pgn: true,
          white_player: {
            select: {
              uuid: true,
              username: true,
              current_rating: true,
            },
          },
          black_player: {
            select: {
              uuid: true,
              username: true,
              current_rating: true,
            },
          },
        },
      }),
      this.prisma.game.count({
        where: {
          status: 'COMPLETED',
          OR: [{ white_player_id: userUuid }, { black_player_id: userUuid }],
        },
      }),
    ]);

    const data: MatchHistoryItem[] = games.map((game) => {
      const isWhitePlayer = game.white_player.uuid === userUuid;
      const playerColor: 'white' | 'black' = isWhitePlayer ? 'white' : 'black';
      const opponent = isWhitePlayer ? game.black_player : game.white_player;
      const result: 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW' =
        game.result ?? 'DRAW';

      let outcome: 'WIN' | 'LOSS' | 'DRAW';

      if (result === 'WHITE_WINS') {
        outcome = isWhitePlayer ? 'WIN' : 'LOSS';
      } else if (result === 'BLACK_WINS') {
        outcome = isWhitePlayer ? 'LOSS' : 'WIN';
      } else {
        outcome = 'DRAW';
      }

      return {
        gameId: game.uuid,
        createdAt: game.created_at,
        playerColor,
        outcome,
        result,
        opponent: {
          uuid: opponent.uuid,
          username: opponent.username,
          rating: opponent.current_rating,
        },
        pgn: game.pgn,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
