import { Controller, Post, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CurrentUser, Roles, RequirePermissions, Public } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';
import { Role } from '@prisma/client';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  private tenantId(user: AuthenticatedUser): string {
    if (!user.tenantId) throw new BadRequestException('Akun tidak terkait tenant.');
    return user.tenantId;
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.BILLING_MANAGE)
  @Post('subscription/:id/snap-token')
  @ApiOperation({ summary: 'Mendapatkan Snap Token Midtrans untuk pembayaran subscription' })
  async getSubscriptionSnapToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentService.getSubscriptionSnapToken(this.tenantId(user), id);
  }

  @Public()
  @Post('notification')
  @ApiOperation({ summary: 'Webhook notifikasi status pembayaran dari Midtrans' })
  async handleNotification(@Body() body: any) {
    return this.paymentService.handleNotification(body);
  }
}
