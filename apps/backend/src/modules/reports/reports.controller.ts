import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  SalesReportQueryDto,
  TopProductsQueryDto,
  ShiftReportQueryDto,
} from './dto/report-query.dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Ringkasan penjualan harian/mingguan/bulanan/custom + breakdown payment method' })
  getSalesSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalesReportQueryDto,
  ) {
    return this.reportsService.getSalesSummary(user, query);
  }

  @Get('top-products')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Top produk terlaris berdasarkan revenue + margin profit' })
  getTopProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TopProductsQueryDto,
  ) {
    return this.reportsService.getTopProducts(user, query);
  }

  @Get('shifts')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Rekap shift beserta total penjualan per shift' })
  getShiftSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ShiftReportQueryDto,
  ) {
    return this.reportsService.getShiftSummary(user, query);
  }

  @Get('hourly')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Distribusi penjualan per jam (0–23) — jam ramai vs sepi' })
  getHourlySales(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalesReportQueryDto,
  ) {
    return this.reportsService.getHourlySales(user, query);
  }

  @Get('by-category')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Kontribusi penjualan per kategori produk' })
  getSalesByCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalesReportQueryDto,
  ) {
    return this.reportsService.getSalesByCategory(user, query);
  }

  @Get('sales/export')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Download laporan penjualan dalam format Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportSalesXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalesReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportSalesXlsx(user, query);
    const filename = `kasirku-penjualan-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
