import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ example: 'outlet-cuid' })
  @IsString()
  outletId: string;

  @ApiProperty({ example: 500000, description: 'Modal awal kas dalam Rupiah' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingCash: number;

  @ApiPropertyOptional({ example: 'Shift pagi' })
  @IsOptional()
  @IsString()
  notes?: string;
}
