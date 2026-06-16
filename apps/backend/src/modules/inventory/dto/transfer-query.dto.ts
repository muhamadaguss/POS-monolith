import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransferStatus } from '@prisma/client';

/** Filter & paginasi untuk daftar transfer stok antar-outlet. */
export class TransferQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  /** Cari pada nama produk dalam transfer atau nama outlet asal/tujuan. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
