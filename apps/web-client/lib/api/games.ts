// src/games/dto/match-history.dto.ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMatchHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export interface MatchHistoryItem {
  gameId: string;
  createdAt: Date;
  playerColor: 'white' | 'black';
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  result: 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW';
  opponent: {
    uuid: string;
    username: string;
    rating: number;
  };
  pgn: string | null;
}

export interface PaginatedMatchHistoryResponse {
  data: MatchHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
