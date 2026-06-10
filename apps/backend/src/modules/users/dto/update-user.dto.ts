import { IsEnum, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN harus 6 digit angka' })
  pin?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
