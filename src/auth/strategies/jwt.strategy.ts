import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey', // Make sure to use env vars in production
    });
  }

  async validate(payload: any) {
    // The payload is what we signed in auth.service.ts
    // Optionally fetch the latest user from DB to ensure they aren't deleted
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is deactivated.');
    }

    // This object gets attached to the Request as req.user
    return {
      id: payload.sub,
      userId: payload.sub,
      roleId: payload.roleId || user.roleId || '',
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      status: payload.status,
    };
  }
}
