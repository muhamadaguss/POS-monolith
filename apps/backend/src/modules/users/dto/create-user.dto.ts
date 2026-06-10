import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(['STORE_MANAGER', 'CASHIER'], {
    message: 'Role hanya boleh STORE_MANAGER atau CASHIER',
  })
  role: 'STORE_MANAGER' | 'CASHIER';

  @IsString()
  @IsNotEmpty()
  outletId: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN harus 6 digit angka' })
  pin?: string;
}
