import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class TransactionItemDto {
  @ApiProperty({ example: 'product-cuid' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-cuid', description: 'Isi jika produk memiliki varian' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 2, description: 'Jumlah unit (support desimal untuk satuan kg/liter)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'outlet-cuid' })
  @IsString()
  outletId: string;

  @ApiProperty({ type: [TransactionItemDto], description: 'Minimal 1 item' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 50000, description: 'Jumlah uang yang dibayarkan customer — harus >= totalAmount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ example: 'discount-cuid', description: 'ID diskon yang diaplikasikan (opsional)' })
  @IsOptional()
  @IsString()
  discountId?: string;

  @ApiPropertyOptional({ example: 'Pelanggan VIP' })
  @IsOptional()
  @IsString()
  notes?: string;
}
