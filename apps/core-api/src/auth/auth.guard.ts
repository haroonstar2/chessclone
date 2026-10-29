import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub: string } }>();

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);

      request.log?.info(
        { userId: payload.sub, gameId: '' },
        'HTTP request authenticated',
      );

      request.user = {
        sub: payload.sub,
      };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, headerToken] = request.headers.authorization?.split(' ') ?? [];

    if (type === 'Bearer' && headerToken) {
      return headerToken;
    }

    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('access_token='));

    return cookie?.slice('access_token='.length);
  }
}
