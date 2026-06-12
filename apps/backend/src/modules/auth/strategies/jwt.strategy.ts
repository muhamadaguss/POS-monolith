import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload, AuthenticatedUser } from '../../../common/types/jwt-payload.type';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

/** Ekstrak access token dari cookie `access_token` (bila ada). Mengembalikan
 *  null bila tak ada — agar extractor berikutnya (header) dicoba. */
function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Header Authorization tetap jalur UTAMA (tak breaking); cookie `access_token`
      // sebagai fallback untuk frontend cookie-based. Urutan: header dulu, lalu cookie.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Akun tidak ditemukan atau sudah dinonaktifkan');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      currentOutletId: payload.currentOutletId,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
