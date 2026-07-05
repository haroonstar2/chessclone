import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import { ConfigService } from '@nestjs/config';

import { RegisterDto } from './dto/register-user.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const foundUser = await this.usersService.findByEmail(registerDto.email);

    if (foundUser) {
      throw new ConflictException(
        `Email '${registerDto.email}' has already been registered`,
      );
    }

    // Generates a random salt, hashes using bcrypte with 10 salt rounds
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.createUser({
      email: registerDto.email,
      username: registerDto.username,
      password_hash: passwordHash,
    });

    return this.issueAccessToken(user.uuid);
  }

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    const passwordMatches = await bcrypt.compare(pass, user.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return this.issueAccessToken(user.uuid);
  }

  private async issueAccessToken(
    uuid: string,
  ): Promise<{ accessToken: string }> {
    const payload = { sub: uuid };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = await this.jwtService.signAsync(
      { sub: user.uuid },
      {
        secret: this.configService.getOrThrow('JWT_RESET_SECRET'),
        expiresIn: '15m',
      },
    );

    try {
      await this.emailService.sendResetPasswordLink(email, token);
    } catch {
      throw new UnauthorizedException('Invalid Email Information');
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('JWT_RESET_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updateUser({
      where: { uuid: payload.sub },
      data: { password_hash: passwordHash },
    });

    return { message: 'Password reset successfully' };
  }
}
