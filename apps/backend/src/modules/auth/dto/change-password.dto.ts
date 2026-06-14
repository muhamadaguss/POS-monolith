import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'PasswordLama123', description: 'Password saat ini' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  oldPassword: string;

  @ApiProperty({
    example: 'PasswordBaru123',
    minLength: 8,
    description: 'Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password baru harus mengandung huruf besar, huruf kecil, dan angka',
  })
  newPassword: string;
}
