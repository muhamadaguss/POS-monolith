import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminTenantsService } from './admin-tenants.service';
import {
  TenantQueryDto,
  UpdateTenantStatusDto,
  UpdateTenantPlanDto,
} from './dto/admin-tenant.dto';
import { Roles } from '../../common/decorators';

@ApiTags('Admin - Tenants')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles(Role.SUPER_ADMIN) // SELURUH controller khusus Super Admin (hierarki: Owner tak lolos)
export class AdminTenantsController {
  constructor(private adminTenantsService: AdminTenantsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistik ringkas seluruh platform' })
  getStats() {
    return this.adminTenantsService.getStats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Daftar semua tenant (search + filter status/plan)' })
  findAll(@Query() query: TenantQueryDto) {
    return this.adminTenantsService.findAll(query);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Detail tenant + statistik + riwayat langganan' })
  findOne(@Param('id') id: string) {
    return this.adminTenantsService.findOne(id);
  }

  @Patch('tenants/:id/status')
  @ApiOperation({ summary: 'Ubah status tenant' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantStatusDto) {
    return this.adminTenantsService.updateStatus(id, dto.status);
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Ganti paket tenant (override + warning bila melebihi batas)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateTenantPlanDto) {
    return this.adminTenantsService.updatePlan(id, dto.plan);
  }
}
