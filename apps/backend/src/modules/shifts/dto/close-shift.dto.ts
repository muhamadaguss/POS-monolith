import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ example: 1250000, description: 'Jumlah uang kas fisik saat tutup shift (Rupiah)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional({ example: 'Shift selesai normal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
