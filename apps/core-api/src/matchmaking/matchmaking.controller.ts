import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { MatchmakingService } from './matchmaking.service.js';
import { JoinMatchmakingDto } from './dto/join-matchmaking.dto.js';

@UseGuards(AuthGuard)
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('join')
  join(@Req() req: Request & { user: { sub: string } }, @Body() dto: JoinMatchmakingDto) {
    return this.matchmakingService.join(req.user.sub, dto.timeControl);
  }

  @Get('status')
  getStatus(@Req() req: Request & { user: { sub: string } }) {
    return this.matchmakingService.getStatus(req.user.sub);
  }

  @Delete('leave')
  leave(
    @Req() req: Request & { user: { sub: string } },
    @Query('timeControl') timeControl: string,
  ) {
    return this.matchmakingService.leave(req.user.sub, timeControl);
  }
}
