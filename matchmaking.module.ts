import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { MatchmakingService } from './matchmaking.service.js';
import { MatchmakingController } from './matchmaking.controller.js';

@Module({
  controllers: [MatchmakingController],
  imports: [RedisModule],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
```