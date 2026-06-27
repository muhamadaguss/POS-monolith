import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly serverKey: string;
  private readonly isProd: boolean;
  private readonly snapUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private billingService: BillingService,
  ) {
    const rawKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    this.serverKey = rawKey.trim();
    this.isProd = this.configService.get<string>('MIDTRANS_IS_PRODUCTION', 'false') === 'true';
    this.snapUrl = this.isProd
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    this.logger.log(`Midtrans mode: ${this.isProd ? 'PRODUCTION' : 'SANDBOX'}, URL: ${this.snapUrl}`);
    this.logger.log(`Midtrans ServerKey length: ${this.serverKey.length}, first: ${this.serverKey.substring(0, 3)}, last: ${this.serverKey.slice(-2)}`);
  }

  /**
   * Mendapatkan Snap Token dari Midtrans untuk tagihan subscription tertentu
   */
  async getSubscriptionSnapToken(tenantId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!sub || sub.tenantId !== tenantId) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    if (sub.isPaid) {
      throw new BadRequestException('Tagihan ini sudah lunas');
    }

    const payload = {
      transaction_details: {
        order_id: sub.id,
        gross_amount: Math.round(Number(sub.amount)),
      },
      customer_details: {
        first_name: sub.tenant.name,
        email: sub.tenant.email,
        phone: sub.tenant.phone || '',
      },
      item_details: [
        {
          id: sub.plan,
          price: Math.round(Number(sub.amount)),
          quantity: 1,
          name: `Langganan Kasirku Paket ${sub.plan}`,
        },
      ],
    };

    const authHeader = Buffer.from(`${this.serverKey}:`).toString('base64');

    try {
      const response = await fetch(this.snapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Midtrans API Error Payload: ${errorText}`);
        throw new BadRequestException(`Midtrans: ${errorText}`);
      }

      const data = await response.json();
      return {
        token: data.token,
        redirectUrl: data.redirect_url,
      };
    } catch (error) {
      this.logger.error(`Error requesting Midtrans Snap Token: ${error.message}`);
      throw new BadRequestException(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    }
  }

  /**
   * Menangani notification/webhook dari Midtrans
   */
  async handleNotification(body: any) {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

    // 1. Verifikasi Signature
    // Signature Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
    const payloadStr = `${order_id}${status_code}${gross_amount}${this.serverKey}`;
    const calculatedSignature = crypto
      .createHash('sha512')
      .update(payloadStr)
      .digest('hex');

    if (calculatedSignature !== signature_key) {
      this.logger.warn(`Invalid signature detected for order: ${order_id}`);
      throw new BadRequestException('Signature tidak valid');
    }

    this.logger.log(`Webhook received: Order ID ${order_id}, status: ${transaction_status}`);

    // 2. Proses status pembayaran
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const sub = await this.prisma.subscription.findUnique({ where: { id: order_id } });
      if (!sub) {
        throw new NotFoundException('Subscription tidak ditemukan');
      }

      if (!sub.isPaid) {
        // Panggil billingService.pay() untuk mengubah status pembayaran dan mengaktifkan plan
        await this.billingService.pay(sub.tenantId, sub.id);
        this.logger.log(`Subscription ${order_id} successfully paid and activated`);
      }
    }

    return { success: true };
  }
}
