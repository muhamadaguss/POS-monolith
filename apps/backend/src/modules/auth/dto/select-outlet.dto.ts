import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelectOutletDto {
  @ApiProperty({ example: 'outlet-cuid', description: 'ID outlet yang ingin diaktifkan untuk sesi ini' })
  @IsString()
  @IsNotEmpty()
  outletId: string;

  @ApiPropertyOptional({
    description:
      'Refresh token saat ini. Bila dikirim, refresh token akan ikut dirotasi ' +
      'agar currentOutletId konsisten antara access & refresh token.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
