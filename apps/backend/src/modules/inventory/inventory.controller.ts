import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { MutationQueryDto } from './dto/mutation-query.dto';
import { CurrentUser, Roles, RequirePermissions, RequireAnyPermission } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @RequireAnyPermission(PERMISSIONS.INVENTORY_VIEW_LOCAL, PERMISSIONS.INVENTORY_VIEW_ALL)
  @ApiOperation({ summary: 'Lihat stok produk per outlet — support filter & low stock alert' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(user, query);
  }

  @Get('mutations')
  @RequireAnyPermission(PERMISSIONS.INVENTORY_VIEW_LOCAL, PERMISSIONS.INVENTORY_VIEW_ALL)
  @ApiOperation({ summary: 'Riwayat mutasi stok (sale, adjustment, transfer, dll)' })
  getMutations(@CurrentUser() user: AuthenticatedUser, @Query() query: MutationQueryDto) {
    return this.inventoryService.getMutations(user, query);
  }

  @Get('adjustments')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Daftar stock opname / penyesuaian manual' })
  @ApiQuery({ name: 'outletId', required: false })
  getAdjustments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
  ) {
    return this.inventoryService.getAdjustments(user, outletId);
  }

  @Post('adjustments')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Buat stock opname — koreksi stok fisik vs sistem' })
  createAdjustment(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createAdjustment(dto, user);
  }

  @Get('transfers')
  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({ summary: 'Daftar transfer stok antar cabang' })
  @ApiQuery({ name: 'outletId', required: false })
  getTransfers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
  ) {
    return this.inventoryService.getTransfers(user, outletId);
  }

  @Post('transfers')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({ summary: 'Ajukan transfer stok dari outlet A ke outlet B' })
  createTransfer(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createTransfer(dto, user);
  }

  @Patch('transfers/:id')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({ summary: 'Terima / tolak / batalkan transfer stok' })
  processTransfer(
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.processTransfer(id, dto, user);
  }
}
