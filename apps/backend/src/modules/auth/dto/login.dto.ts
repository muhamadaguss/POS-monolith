import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'owner@tokosaya.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'tokosaya', description: 'Slug tenant (wajib kecuali Super Admin)' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @ApiPropertyOptional({ example: 'outlet-cuid', description: 'Outlet yang ingin diaktifkan langsung setelah login' })
  @IsOptional()
  @IsString()
  outletId?: string;
}
