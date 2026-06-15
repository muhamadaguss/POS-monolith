import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { PlatformReportQueryDto } from './dto/platform-report-query.dto';
import { Roles } from '../../common/decorators';

@ApiTags('Admin - Reports')
@ApiBearerAuth('access-token')
@Controller('admin/reports')
@Roles(Role.SUPER_ADMIN) // seluruh controller khusus Super Admin
export class AdminReportsController {
  constructor(private adminReportsService: AdminReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan pendapatan & pertumbuhan platform' })
  getSummary(@Query() query: PlatformReportQueryDto) {
    return this.adminReportsService.getSummary(query);
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: 'Tren pendapatan lunas & tenant baru per bulan' })
  getRevenueTrend(@Query() query: PlatformReportQueryDto) {
    return this.adminReportsService.getRevenueTrend(query);
  }

  @Get('plan-distribution')
  @ApiOperation({
    summary: 'Distribusi tenant aktif per paket + kontribusi MRR',
  })
  getPlanDistribution() {
    return this.adminReportsService.getPlanDistribution();
  }

  @Get('export')
  @ApiOperation({
    summary: 'Unduh laporan platform dalam format Excel (.xlsx)',
  })
  async export(
    @Query() query: PlatformReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.adminReportsService.exportXlsx(query);
    const filename = `kasirku-laporan-platform-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
