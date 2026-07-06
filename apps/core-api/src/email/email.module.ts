import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [ConfigModule, JwtModule, UsersModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
