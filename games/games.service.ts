import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchHistoryItem, PaginatedMatchHistoryResponse } from './dto/match-history.dto';

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
          OR: [
            { whitePlayerId: userUuid },
            { blackPlayerId: userUuid },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          uuid: true,
          createdAt: true,
          result: true,
          pgn: true,
          whitePlayer: {
            select: {
              uuid: true,
              username: true,
              currentRating: true,
            },
          },
          blackPlayer: {
            select: {
              uuid: true,
              username: true,
              currentRating: true,
            },
          },
        },
      }),
      this.prisma.game.count({
        where: {
          status: 'COMPLETED',
          OR: [
            { whitePlayerId: userUuid },
            { blackPlayerId: userUuid },
          ],
        },
      }),
    ]);

    const data = games.map((game) => {
      const isWhitePlayer = game.whitePlayer.uuid === userUuid;
      const playerColor = isWhitePlayer ? 'white' : 'black';
      const opponent = isWhitePlayer ? game.blackPlayer : game.whitePlayer;
      
      let outcome: 'WIN' | 'LOSS' | 'DRAW';
      
      if (game.result === 'WHITE_WINS') {
        outcome = isWhitePlayer ? 'WIN' : 'LOSS';
      } else if (game.result === 'BLACK_WINS') {
        outcome = isWhitePlayer ? 'LOSS' : 'WIN';
      } else {
        outcome = 'DRAW';
      }

      return {
        gameId: game.uuid,
        createdAt: game.createdAt,
        playerColor,
        outcome,
        result: game.result,
        opponent: {
          uuid: opponent.uuid,
          username: opponent.username,
          rating: opponent.currentRating,
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
