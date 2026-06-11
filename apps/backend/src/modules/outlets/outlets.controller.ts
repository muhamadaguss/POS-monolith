import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OutletsService } from './outlets.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { CurrentUser, Roles, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Outlets')
@ApiBearerAuth('access-token')
@Controller('outlets')
export class OutletsController {
  constructor(private outletsService: OutletsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar outlet milik tenant' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.outletsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail outlet berdasarkan ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outletsService.findOne(id, user);
  }

  @Post()
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.OUTLET_MANAGE)
  @ApiOperation({ summary: 'Buat outlet baru' })
  create(@Body() dto: CreateOutletDto, @CurrentUser() user: AuthenticatedUser) {
    return this.outletsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.OUTLET_MANAGE)
  @ApiOperation({ summary: 'Update data outlet' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletsService.update(id, dto, user);
  }
}
