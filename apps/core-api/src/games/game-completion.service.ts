import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const CHANNEL = 'game:completed';
const PENDING = 'games:completed:pending';

@Injectable()
export class GameCompletionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(GameCompletionService.name);

  private subscriber?: Redis;
  private retryTimer?: ReturnType<typeof setInterval>;

  private replaying = false;

  // Tracks all in-flight tasks to ensure they complete before module destruction.
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    // Subscriber connections cannot also run ordinary Redis commands.
    this.subscriber = this.redis.getClient().duplicate();

    this.subscriber.on('error', (error) =>
      this.logger.error('Completion subscriber error', error),
    );

    this.subscriber.on('message', (channel, message) => {
      if (channel === CHANNEL) {
        this.track(this.consume(message));
      }
    });

    await this.subscriber.subscribe(CHANNEL);
    await this.replayPending();

    this.retryTimer = setInterval(() => {
      this.track(this.replayPending());
    }, 5000);
    this.retryTimer.unref();
  }

  // Adds a task to the in-flight set and removes it once completed.
  private track(task: Promise<void>) {
    this.inFlight.add(task);
    void task.finally(() => this.inFlight.delete(task));
  }

  private getGameOutcome(result: string, whiteId: string, blackId: string) {
    if (result === '1-0') {
      return { outcome: 'WHITE_WINS' as const, expectedWinner: whiteId };
    }

    if (result === '0-1') {
      return { outcome: 'BLACK_WINS' as const, expectedWinner: blackId };
    }

    return { outcome: 'DRAW' as const, expectedWinner: null };
  }

  // Consumes a single game completion message, persisting it to the database and removing it from the pending set.
  async consume(message: string) {
    try {
      const event = JSON.parse(message);
      const p = event?.payload;

      if (event?.type !== 'GAME_COMPLETED') {
        throw new Error('Invalid event type');
      }

      if (!p) {
        throw new Error('Missing payload');
      }

      // Validate required non-empty string fields
      const hasRequiredFields =
        typeof p.gameId === 'string' &&
        p.gameId.length > 0 &&
        typeof p.whitePlayerId === 'string' &&
        p.whitePlayerId.length > 0 &&
        typeof p.blackPlayerId === 'string' &&
        p.blackPlayerId.length > 0 &&
        typeof p.pgn === 'string' &&
        p.pgn.length > 0;

      if (!hasRequiredFields) {
        throw new Error('Missing required fields');
      }

      // Validate players are distinct
      if (p.whitePlayerId === p.blackPlayerId) {
        throw new Error('White and black players are the same');
      }

      // Validate result code
      const validResults = ['1-0', '0-1', '1/2-1/2'];
      if (!validResults.includes(p.result)) {
        throw new Error('Invalid result');
      }

      // Determine the game outcome and expected winner based on the result and player IDs
      const { outcome: result, expectedWinner } = this.getGameOutcome(
        p.result,
        p.whitePlayerId,
        p.blackPlayerId,
      );

      if (p.winner !== expectedWinner) {
        throw new Error('Winner does not match the result');
      }

      // Persist the game completion to the database, creating a new record if it doesn't exist or updating the existing one.
      await this.prisma.game.upsert({
        where: { uuid: p.gameId },
        create: {
          uuid: p.gameId,
          white_player_id: p.whitePlayerId,
          black_player_id: p.blackPlayerId,
          status: 'COMPLETED',
          result,
          pgn: p.pgn,
        },
        update: { status: 'COMPLETED', result, pgn: p.pgn },
      });

      // Remove the game from the pending list in Redis after successful persistence.
      await this.redis.getClient().hdel(PENDING, p.gameId);
    } catch (error) {
      this.logger.error(
        'Failed to persist game completion; pending event retained',
        error,
      );
    }
  }

  // Replay any pending game completions from Redis.
  private async replayPending() {
    // Prevent concurrent replay attempts.
    if (this.replaying) return;
    this.replaying = true;

    try {
      // Retrieve all pending game completions from Redis.
      const pending = await this.redis.getClient().hgetall(PENDING);

      // Consume each pending game completion message.
      for (const message of Object.values(pending)) {
        await this.consume(message);
      }
    } catch (error) {
      this.logger.error('Unable to replay pending game completions', error);
    } finally {
      this.replaying = false;
    }
  }

  async onModuleDestroy() {
    if (this.retryTimer) clearInterval(this.retryTimer);
    if (this.subscriber) await this.subscriber.quit();
    await Promise.all(this.inFlight);
  }
}
