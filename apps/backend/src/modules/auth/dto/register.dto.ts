import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlan } from '@prisma/client';

/**
 * DTO untuk registrasi user baru + pembuatan tenant baru.
 * Proses:
 * 1. Validasi input
 * 2. Create Tenant (status TRIAL untuk FREE, ACTIVE untuk STARTER/GROWTH)
 * 3. Create User (role: TENANT_OWNER)
 * 4. Create Outlet pertama
 * 5. Auto-login → return token
 */
export class RegisterDto {
  // ── User Information ────────────────────────────────────────
  @IsEmail({}, { message: 'Email tidak valid' })
  @MaxLength(120, { message: 'Email maksimal 120 karakter' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @MaxLength(120, { message: 'Nama lengkap maksimal 120 karakter' })
  ownerName: string;

  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(120, { message: 'Password maksimal 120 karakter' })
  password: string;

  // ── Tenant Information ───────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'Nama bisnis wajib diisi' })
  @MaxLength(120, { message: 'Nama bisnis maksimal 120 karakter' })
  businessName: string;

  @IsString()
  @IsNotEmpty({ message: 'URL bisnis wajib diisi' })
  @MaxLength(60, { message: 'URL bisnis maksimal 60 karakter' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung (mis. "toko-saya").',
  })
  businessSlug: string;

  // ── Outlet Information ───────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'Nama outlet wajib diisi' })
  @MaxLength(120, { message: 'Nama outlet maksimal 120 karakter' })
  outletName: string;

  // ── Subscription Plan ───────────────────────────────────────
  @IsEnum(SubscriptionPlan, { message: 'Paket subscription tidak valid' })
  plan: SubscriptionPlan;
}
