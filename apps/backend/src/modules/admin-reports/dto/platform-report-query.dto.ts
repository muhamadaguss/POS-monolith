import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportPeriod {
  LAST_30D = '30d',
  LAST_90D = '90d',
  YTD = 'ytd',
  CUSTOM = 'custom',
}

/** Query rentang laporan platform Super Admin. */
export class PlatformReportQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.LAST_30D })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Wajib bila period=custom',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Wajib bila period=custom',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
