import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidTransactionDto {
  @ApiProperty({ example: 'Salah input produk', description: 'Alasan void transaksi' })
  @IsString()
  @MinLength(1)
  voidReason: string;

  @ApiProperty({ example: '123456', description: 'PIN 6-digit milik Manager/Owner di outlet ini' })
  @IsString()
  managerPin: string;
}
