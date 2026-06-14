import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsEmail,
  Matches,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlan, TenantStatus } from '@prisma/client';

export class TenantQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status: TenantStatus;
}

export class UpdateTenantPlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}

/**
 * Provisioning tenant baru (Super Admin). Membuat Tenant + Owner + Outlet pertama
 * + Subscription awal dalam satu transaksi. Password owner di-generate backend.
 * Status awal dibatasi TRIAL/ACTIVE (tak boleh langsung SUSPENDED/CANCELLED).
 */
export class CreateTenantDto {
  // ── Tenant ────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung (mis. "toko-saya").',
  })
  slug: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsIn([TenantStatus.TRIAL, TenantStatus.ACTIVE], {
    message: 'Status awal harus TRIAL atau ACTIVE.',
  })
  status: TenantStatus;

  // ── Outlet pertama ────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  outletName: string;

  // ── Owner ─────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ownerPhone?: string;
}
