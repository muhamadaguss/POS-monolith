import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import {
  AdminUserQueryDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  CreateUserDto,
} from './dto/admin-user.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@ApiTags('Admin - Users')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles(Role.SUPER_ADMIN) // SELURUH controller khusus Super Admin
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get('users/stats')
  @ApiOperation({ summary: 'Statistik user lintas-platform (KPI)' })
  getStats() {
    return this.adminUsersService.getStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Daftar semua user lintas-tenant (search + filter)',
  })
  findAll(@Query() query: AdminUserQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Post('users')
  @ApiOperation({
    summary: 'Buat user baru di tenant (password generate, tampil sekali)',
  })
  create(@Body() dto: CreateUserDto) {
    return this.adminUsersService.createUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detail user + peran per-outlet' })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Aktif/nonaktifkan user' })
  updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(admin.userId, id, dto.status);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Ubah role tenant user (bukan SUPER_ADMIN)' })
  updateRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(admin.userId, id, dto.role);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({
    summary: 'Reset password user — generate sementara, tampil sekali',
  })
  resetPassword(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.adminUsersService.resetPassword(admin.userId, id);
  }
}
