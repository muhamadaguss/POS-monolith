import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class SetPriceDto {
  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  sellPrice: number;
}
