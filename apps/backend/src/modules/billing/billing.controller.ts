import { Controller, Get, Post, Body, Param, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { CurrentUser, Roles, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@Controller('billing')
@Roles(Role.TENANT_OWNER)
@RequirePermissions(PERMISSIONS.BILLING_MANAGE)
export class BillingController {
  constructor(private billingService: BillingService) {}

  private tenantId(user: AuthenticatedUser): string {
    if (!user.tenantId) throw new BadRequestException('Akun tidak terkait tenant.');
    return user.tenantId;
  }

  @Get('plans')
  @ApiOperation({ summary: 'Katalog paket langganan yang tersedia' })
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Status langganan tenant saat ini + pemakaian outlet & staf' })
  getSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getSubscription(this.tenantId(user));
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Riwayat tagihan langganan tenant' })
  getInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getInvoices(this.tenantId(user));
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Pilih paket — buat invoice (belum lunas) untuk dibayar' })
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.billingService.subscribe(this.tenantId(user), dto.plan);
  }

  @Post('invoices/:id/pay')
  @ApiOperation({ summary: 'Bayar invoice (SIMULASI) — aktifkan paket' })
  pay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.billingService.pay(this.tenantId(user), id);
  }
}
