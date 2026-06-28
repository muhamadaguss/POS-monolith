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
  @Post('subscription/:id/pay')
  @ApiOperation({ summary: 'Membuat pembayaran iPaymu dan mendapatkan redirect URL' })
  async createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentService.createPayment(this.tenantId(user), id);
  }

  @Public()
  @Post('notification')
  @ApiOperation({ summary: 'Callback notifikasi status pembayaran dari iPaymu' })
  async handleNotification(@Body() body: any) {
    return this.paymentService.handleNotification(body);
  }

  @Public()
  @Post('return-verify')
  @ApiOperation({ summary: 'Verifikasi pembayaran via return URL iPaymu dan aktivasi subscription' })
  async returnVerify(@Body() body: { sub_id: string; trx_id?: string; status?: string }) {
    return this.paymentService.returnVerify(body);
  }

  @Public()
  @Post('return-verify-by-sid')
  @ApiOperation({ summary: 'Verifikasi pembayaran via SessionId (sid) dari iPaymu' })
  async returnVerifyBySid(@Body() body: { sid: string; trx_id?: string; status?: string }) {
    return this.paymentService.returnVerifyBySid(body);
  }
}
