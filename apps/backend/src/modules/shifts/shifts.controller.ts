import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SHIFT_MANAGE)
  @ApiOperation({ summary: 'Detail shift beserta semua transaksi di dalamnya' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shiftsService.findOne(id, user);
  }
}
