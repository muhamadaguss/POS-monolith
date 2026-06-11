import { Controller, Get, Post, Patch, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';
import { CurrentUser, RequireAnyPermission, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Shifts')
@ApiBearerAuth('access-token')
@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Post('open')
  @RequireAnyPermission(PERMISSIONS.SHIFT_OWN, PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Buka shift — input modal awal kas' })
  openShift(@Body() dto: OpenShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shiftsService.openShift(dto, user);
  }

  @Patch(':id/close')
  @RequireAnyPermission(PERMISSIONS.SHIFT_OWN, PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Tutup shift — input kas fisik, sistem hitung selisih' })
  closeShift(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shiftsService.closeShift(id, dto, user);
  }

  @Get('active')
  @RequireAnyPermission(PERMISSIONS.SHIFT_OWN, PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Cek shift aktif di suatu outlet' })
  getActiveShift(@Query('outletId') outletId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shiftsService.getActiveShift(outletId, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Riwayat shift — Manager/Owner' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ShiftQueryDto) {
    return this.shiftsService.findAll(user, query);
  }

  // Rute statis didahulukan sebelum ':id' agar tak tertangkap sebagai shiftId.
  @Get('stats')
  @RequirePermissions(PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Statistik ringkas riwayat shift (kartu)' })
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: ShiftQueryDto) {
    return this.shiftsService.getStats(user, query);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Download riwayat shift dalam format Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ShiftQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.shiftsService.exportXlsx(user, query);
    const filename = `kasirku-riwayat-shift-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Detail shift beserta semua transaksi di dalamnya' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shiftsService.findOne(id, user);
  }
}
