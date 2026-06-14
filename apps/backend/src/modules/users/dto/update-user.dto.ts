import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Password & PIN tidak lagi diubah lewat update — gunakan endpoint reset
  // (POST /users/:id/reset-password, POST /users/:id/reset-pin) yang generate
  // kredensial acak & menampilkannya sekali.

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
