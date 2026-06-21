import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectOutletDto } from './dto/select-outlet.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PinDto } from './dto/pin.dto';
import { RegisterDto } from './dto/register.dto';
import { Public, CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Rate-limit ketat khusus login (anti brute-force) — 5 percobaan / menit / IP,
  // jauh lebih ketat dari throttler global (100/menit). Override-able via env.
  @Public()
  @Throttle({
    default: {
      limit: parseInt(process.env.THROTTLE_LOGIN_LIMIT ?? '5', 10),
      ttl: parseInt(process.env.THROTTLE_LOGIN_TTL ?? '60000', 10),
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan access + refresh token' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = req.ip ?? req.socket.remoteAddress;
    return this.authService.login(dto, ip, userAgent);
  }

  // Register endpoint — rate limit ketat (3 percobaan/menit/IP) untuk mencegah abuse.
  @Public()
  @Throttle({
    default: {
      limit: parseInt(process.env.THROTTLE_REGISTER_LIMIT ?? '3', 10),
      ttl: parseInt(process.env.THROTTLE_REGISTER_TTL ?? '60000', 10),
    },
  })
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Daftar akun baru + buat tenant + outlet pertama (auto-login)',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Refresh juga endpoint publik — batasi lebih ketat dari global (10/menit/IP).
  @Public()
  @Throttle({
    default: {
      limit: parseInt(process.env.THROTTLE_REFRESH_LIMIT ?? '10', 10),
      ttl: parseInt(process.env.THROTTLE_REFRESH_TTL ?? '60000', 10),
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perbarui access token menggunakan refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('select-outlet')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Pilih outlet aktif — generate token baru dengan currentOutletId',
  })
  selectOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectOutletDto,
  ) {
    return this.authService.selectOutlet(user, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — revoke refresh token saat ini' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { refreshToken?: string },
  ) {
    return this.authService.logout(user.userId, body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout dari semua perangkat' })
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.userId);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ganti password sendiri (semua role)' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @Post('setup-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Buat PIN pertama kali (gate login kasir)' })
  setupPin(@CurrentUser() user: AuthenticatedUser, @Body() dto: PinDto) {
    return this.authService.setupPin(user, dto.pin);
  }

  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Verifikasi PIN setelah login (kunci akun bila 3× gagal)',
  })
  verifyPin(@CurrentUser() user: AuthenticatedUser, @Body() dto: PinDto) {
    return this.authService.verifyPin(user, dto.pin);
  }
}
