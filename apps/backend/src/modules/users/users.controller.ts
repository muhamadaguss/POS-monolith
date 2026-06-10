import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, Roles, RequirePermissions, RequireAnyPermission } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

class AssignRoleDto {
  @ApiProperty({ example: 'outlet-cuid', description: 'ID outlet tujuan' })
  @IsString() @IsNotEmpty() outletId: string;

  @ApiProperty({ enum: [Role.STORE_MANAGER, Role.CASHIER] })
  @IsEnum([Role.STORE_MANAGER, Role.CASHIER]) role: Role;
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@Roles(Role.STORE_MANAGER) // minimum Store Manager, endpoint tertentu di-override
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequireAnyPermission(PERMISSIONS.STAFF_VIEW_LOCAL, PERMISSIONS.STAFF_MANAGE_LOCAL, PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({ summary: 'Daftar semua staf di tenant' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  @RequireAnyPermission(PERMISSIONS.STAFF_VIEW_LOCAL, PERMISSIONS.STAFF_MANAGE_LOCAL, PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({ summary: 'Detail staf berdasarkan ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(id, user);
  }

  @Post()
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({ summary: 'Buat akun staf baru (Tenant Owner only)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  @RequireAnyPermission(PERMISSIONS.STAFF_MANAGE_LOCAL, PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({ summary: 'Update data staf' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nonaktifkan akun staf' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deactivate(id, user);
  }

  @Post(':id/assign-role')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({ summary: 'Assign role staf di outlet tertentu' })
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignOutletRole(id, dto.outletId, dto.role, user);
  }

  @Delete(':id/assign-role')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus role staf dari outlet tertentu' })
  unassignRole(
    @Param('id') id: string,
    @Body() dto: Pick<AssignRoleDto, 'outletId'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.unassignOutletRole(id, dto.outletId, user);
  }
}
