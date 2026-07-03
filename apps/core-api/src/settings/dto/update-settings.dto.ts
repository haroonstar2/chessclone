import { PartialType } from '@nestjs/swagger';

import { IsBoolean, IsDate, IsString, IsUUID } from 'class-validator';

export class SettingsDto {
  @IsUUID()
  uuid: string;

  @IsString()
  userId: string;

  @IsString()
  boardTheme: string;

  @IsString()
  pieceTheme: string;

  @IsBoolean()
  sound: boolean;

  @IsBoolean()
  autoQueen: boolean;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}

export class UpdateSettingsDto extends PartialType(SettingsDto) {}
