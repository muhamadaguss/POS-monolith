import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundTransactionDto {
  @ApiProperty({ example: 'Barang dikembalikan pembeli', description: 'Alasan refund transaksi' })
  @IsString()
  @MinLength(1)
  refundReason: string;

  @ApiProperty({ example: '123456', description: 'PIN 6-digit milik Manager/Owner di outlet ini' })
  @IsString()
  managerPin: string;
}
