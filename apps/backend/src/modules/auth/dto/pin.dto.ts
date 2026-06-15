import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** PIN 6 digit numerik — dipakai untuk setup & verifikasi gate login kasir. */
export class PinDto {
  @ApiProperty({ example: '123456', description: 'PIN 6 digit angka' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN harus 6 digit angka' })
  pin: string;
}
