import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}

export class CreateStockTransferDto {
  @IsString()
  @IsNotEmpty()
  fromOutletId: string;

  @IsString()
  @IsNotEmpty()
  toOutletId: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}

export class UpdateTransferStatusDto {
  @IsEnum(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  note?: string;
}
