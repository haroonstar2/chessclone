import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

export type MatchmakingStatus = 'MATCHED' | 'QUEUED' | 'WAITING';

export interface JoinResult {
  status: MatchmakingStatus;
  gameId?: string;
}

export interface StatusResult {
  status: MatchmakingStatus;
  gameId?: string;
}

const MATCH_TTL_SECONDS = 60;

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async join(userUuid: string, timeControl: string): Promise<JoinResult> {
    const matchKey = `match:user:${userUuid}`;

    // Check if this user already has a pending match (set by a previous join)
    const existingMatch = await this.redis.get(matchKey);
    if (existingMatch) {
      return { status: 'MATCHED', gameId: existingMatch };
    }

    const queueKey = `queue:matchmaking:${timeControl}`;

    // Atomically pop a waiting opponent
    const opponentUuid = await this.redis.rpop(queueKey);

    if (opponentUuid === null) {
      // No opponent waiting — queue this user
      await this.redis.lrem(queueKey, 0, userUuid);
      await this.redis.lpush(queueKey, userUuid);
      return { status: 'QUEUED' };
    }

    if (opponentUuid === userUuid) {
      // Edge case: popped ourselves. Push back and stay queued.
      await this.redis.lpush(queueKey, userUuid);
      return { status: 'QUEUED' };
    }

    // Opponent found — randomly assign white/black
    const isWhite = Math.random() < 0.5;
    const whiteId = isWhite ? userUuid : opponentUuid;
    const blackId = isWhite ? opponentUuid : userUuid;

    const game = await this.prisma.game.create({
      data: {
        white_player_id: whiteId,
        black_player_id: blackId,
        status: 'ACTIVE',
      },
    });

    // Notify the waiting opponent so they discover the match on their next poll
    await this.redis.set(
      `match:user:${opponentUuid}`,
      game.uuid,
      'EX',
      MATCH_TTL_SECONDS,
    );

    return { status: 'MATCHED', gameId: game.uuid };
  }

  async getStatus(userUuid: string): Promise<StatusResult> {
    const matchKey = `match:user:${userUuid}`;
    const gameId = await this.redis.get(matchKey);

    if (gameId) {
      await this.redis.del(matchKey);
      return { status: 'MATCHED', gameId };
    }

    return { status: 'WAITING' };
  }

  async leave(userUuid: string, timeControl: string): Promise<void> {
    const queueKey = `queue:matchmaking:${timeControl}`;
    await this.redis.lrem(queueKey, 0, userUuid);
  }
}
