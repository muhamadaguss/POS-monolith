import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BillingService } from '../billing/billing.service';
import {
  generateIpaymuSignature,
  getIpaymuUrl,
  type IpaymuConfig,
} from './ipaymu.util';

interface IpaymuProduct {
  price: number;
  quantity: number;
  description: string;
}

export interface IpaymuPaymentResult {
  redirectUrl: string;
  sessionId: string;
  transactionId: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly config: IpaymuConfig;
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private billingService: BillingService,
  ) {
    this.config = {
      va: (this.configService.get<string>('IPAYMU_VA') || '').trim(),
      apiKey: (this.configService.get<string>('IPAYMU_API_KEY') || '').trim(),
      isProduction: this.configService.get<string>('IPAYMU_IS_PRODUCTION', 'false') === 'true',
      notifyUrl: this.configService.get<string>('IPAYMU_NOTIFY_URL', ''),
      returnUrl: this.configService.get<string>('IPAYMU_RETURN_URL', ''),
      cancelUrl: this.configService.get<string>('IPAYMU_CANCEL_URL', ''),
    };

    this.apiUrl = getIpaymuUrl(this.config.isProduction);
    this.logger.log(`iPaymu mode: ${this.config.isProduction ? 'PRODUCTION' : 'SANDBOX'}, URL: ${this.apiUrl}`);
    this.logger.log(`iPaymu VA: ${this.config.va}, Key length: ${this.config.apiKey.length}`);
  }

  /**
   * Membuat pembayaran via iPaymu — return URL redirect ke halaman pembayaran iPaymu
   */
  async createPayment(tenantId: string, subscriptionId: string): Promise<IpaymuPaymentResult> {
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

    if (!this.config.va || !this.config.apiKey) {
      throw new BadRequestException('Konfigurasi payment gateway belum lengkap');
    }

    const amount = Math.round(Number(sub.amount));
    const items = this.buildProducts(sub.plan, amount);

    const payload: any = {
      product: items.map((i) => i.description),
      qty: items.map((i) => String(i.quantity)),
      price: items.map((i) => String(i.price)),
      amount: String(amount),
      returnUrl: this.config.returnUrl,
      cancelUrl: this.config.cancelUrl,
      notifyUrl: this.config.notifyUrl,
      referenceId: sub.id,
      buyerName: sub.tenant.name || 'Pelanggan Kasirku',
      buyerEmail: sub.tenant.email || '',
      buyerPhone: sub.tenant.phone || '08123456789',
    };

    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000)); // tetap dikirim di header, tapi tidak di string-to-sign
    const signature = generateIpaymuSignature('POST', this.config.va, body, this.config.apiKey);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          va: this.config.va,
          signature,
          timestamp,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`iPaymu API Error: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Gagal menghubungi payment gateway: ${errorText}`);
      }

      const data = await response.json();

      if (data.Status !== 200 || !data.Data) {
        this.logger.error(`iPaymu responded with error: ${JSON.stringify(data)}`);
        throw new BadRequestException(data.Message || 'Gagal membuat pembayaran');
      }

      this.logger.log(`iPaymu payment created: SessionId=${data.Data.SessionId}, TransactionId=${data.Data.TransactionId}`);

      // Simpan sessionId ke subscription untuk lookup di return URL
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { ipaymuSessionId: data.Data.SessionId },
      });

      return {
        redirectUrl: data.Data.Url,
        sessionId: data.Data.SessionId,
        transactionId: data.Data.TransactionId,
      };
    } catch (error) {
      this.logger.error(`Error requesting iPaymu payment: ${error.message}`);
      throw new BadRequestException(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    }
  }

  /**
   * Menangani callback notifikasi status pembayaran dari iPaymu
   */
  async handleNotification(body: any) {
    const { reference_id, status, trx_id } = body;

    this.logger.log(`iPaymu callback: reference_id=${reference_id}, status=${status}, trx_id=${trx_id}`);

    // iPaymu sends: 'berhasil' / 'pending' / 'expired' / 'dibatalkan' / 'gagal'
    if (status === 'berhasil' || status === 'success') {
      const sub = await this.prisma.subscription.findUnique({
        where: { id: reference_id },
      });

      if (!sub) {
        this.logger.warn(`iPaymu callback for unknown reference_id: ${reference_id}`);
        return { success: true, message: 'OK — subscription not found' };
      }

      if (sub.isPaid) {
        this.logger.warn(`iPaymu callback for already paid subscription: ${reference_id}`);
        return { success: true, message: 'OK — already paid' };
      }

      await this.billingService.pay(sub.tenantId, sub.id);
      this.logger.log(`Subscription ${reference_id} activated via iPaymu callback (trx: ${trx_id})`);
    } else {
      this.logger.log(`iPaymu callback skipped — status not success: ${status}`);
    }

    return { success: true };
  }

  /**
   * Verifikasi pembayaran via return URL iPaymu dan aktivasi subscription.
   * Endpoint PUBLIK — dipanggil dari halaman /payment-return (relay).
   */
  async returnVerify(body: { sub_id: string; trx_id?: string; status?: string }) {
    const { sub_id, trx_id, status } = body;

    this.logger.log(`returnVerify: sub_id=${sub_id}, status=${status}, trx_id=${trx_id}`);

    if (!sub_id) {
      return { success: false, message: 'Missing sub_id' };
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { id: sub_id },
    });

    if (!sub) {
      this.logger.warn(`returnVerify: subscription not found: ${sub_id}`);
      return { success: false, message: 'Subscription tidak ditemukan' };
    }

    if (sub.isPaid) {
      this.logger.log(`returnVerify: already paid: ${sub_id}`);
      return { success: true, message: 'Sudah lunas', isPaid: true };
    }

    if (status === 'berhasil' || status === 'success') {
      await this.billingService.pay(sub.tenantId, sub.id);
      this.logger.log(`returnVerify: activated ${sub_id} via return URL (trx: ${trx_id})`);
      return { success: true, message: 'Pembayaran berhasil diverifikasi', isPaid: true };
    }

    return { success: true, message: `Status: ${status || 'unknown'}`, isPaid: false };
  }

  /**
   * Verifikasi pembayaran via SessionId (sid) dari iPaymu return URL.
   * iPaymu menghapus custom query params, tapi mengembalikan `sid`.
   */
  async returnVerifyBySid(body: { sid: string; trx_id?: string; status?: string }) {
    const { sid, trx_id, status } = body;

    this.logger.log(`returnVerifyBySid: sid=${sid}, status=${status}, trx_id=${trx_id}`);

    if (!sid) {
      return { success: false, message: 'Missing sid' };
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { ipaymuSessionId: sid },
    });

    if (!sub) {
      this.logger.warn(`returnVerifyBySid: subscription not found for sid: ${sid}`);
      return { success: false, message: 'Subscription tidak ditemukan' };
    }

    if (sub.isPaid) {
      this.logger.log(`returnVerifyBySid: already paid: ${sub.id}`);
      return { success: true, message: 'Sudah lunas', isPaid: true };
    }

    if (status === 'berhasil' || status === 'success') {
      await this.billingService.pay(sub.tenantId, sub.id);
      this.logger.log(`returnVerifyBySid: activated ${sub.id} via return sid (trx: ${trx_id})`);
      return { success: true, message: 'Pembayaran berhasil diverifikasi', isPaid: true };
    }

    return { success: true, message: `Status: ${status || 'unknown'}`, isPaid: false };
  }

  /**
   * Build product list sesuai format iPaymu
   */
  private buildProducts(plan: string, amount: number): IpaymuProduct[] {
    return [
      {
        price: amount,
        quantity: 1,
        description: `Langganan Kasirku Paket ${plan}`,
      },
    ];
  }
}
