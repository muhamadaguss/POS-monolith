import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentUser, Roles, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua kategori produk' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kategori berdasarkan ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.findOne(id, user);
  }

  @Post()
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Buat kategori baru' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Update kategori' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Hapus kategori' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.remove(id, user);
  }
}
