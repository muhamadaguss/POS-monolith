import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role, UserStatus } from '@prisma/client';

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  tenantId?: string;

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

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

/**
 * Role yang boleh ditetapkan Super Admin lewat UI ini — HANYA role tenant.
 * SUPER_ADMIN sengaja TIDAK termasuk (tak boleh promosi via UI).
 */
export enum AssignableRole {
  TENANT_OWNER = 'TENANT_OWNER',
  STORE_MANAGER = 'STORE_MANAGER',
  CASHIER = 'CASHIER',
}

export class UpdateUserRoleDto {
  @IsEnum(AssignableRole, {
    message: 'Role harus salah satu dari TENANT_OWNER, STORE_MANAGER, CASHIER',
  })
  role: AssignableRole;
}

/**
 * Buat user baru di sebuah tenant (Super Admin). Role dibatasi role tenant
 * (AssignableRole — tanpa SUPER_ADMIN). Password di-generate backend.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsEnum(AssignableRole, {
    message: 'Role harus salah satu dari TENANT_OWNER, STORE_MANAGER, CASHIER',
  })
  role: AssignableRole;
}
