import { IsString, IsNotEmpty } from 'class-validator';

export class JoinMatchmakingDto {
  @IsString()
  @IsNotEmpty()
  timeControl: string;
}
