import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { join } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

import { appConfig, jwtConfig, sentryConfig } from './config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OutletsModule } from './modules/outlets/outlets.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminTenantsModule } from './modules/admin-tenants/admin-tenants.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    // Config — tersedia global di seluruh aplikasi
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, sentryConfig],
      envFilePath: '.env',
    }),

    // Structured logging (pino) — log JSON 1-baris di production (siap dikonsumsi
    // log shipper/agregator), pretty-print di non-production. Setiap request
    // dapat `reqId`. Field sensitif di-redact agar token/secret tak bocor ke log.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req: IncomingMessage) =>
          (req.headers['x-request-id'] as string) ?? randomUUID(),
        autoLogging: true,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.refreshToken',
            '*.accessToken',
          ],
          censor: '[redacted]',
        },
        serializers: {
          req: (req: { id: unknown; method: unknown; url: unknown }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: unknown }) => ({
            statusCode: res.statusCode,
          }),
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),

    // Rate limiting — 100 req per 60 detik per IP
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60000'),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100'),
      },
    ]),

    // Static files — folder uploads/ diekspos di /uploads (mis. gambar produk)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        // Helmet global menyetel `Cross-Origin-Resource-Policy: same-origin`,
        // yang membuat browser MEMBLOKIR <img> gambar produk saat frontend
        // (origin berbeda) memuatnya. Aset di /uploads bersifat publik &
        // memang dimaksudkan dimuat lintas-origin → longgarkan CORP HANYA di
        // sini (API tetap same-origin).
        setHeaders: (res: ServerResponse) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OutletsModule,
    ProductsModule,
    InventoryModule,
    ShiftsModule,
    TransactionsModule,
    ReportsModule,
    AuditLogsModule,
    BillingModule,
    AdminTenantsModule,
    AdminUsersModule,
    AdminReportsModule,
    HealthModule,
  ],

  providers: [
    // Rate limiter global
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // JWT auth — diterapkan ke semua route kecuali yang @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // RBAC — diaktifkan hanya jika ada @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },

    // Permission check — diaktifkan hanya jika ada @RequirePermissions()
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Global exception handler
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Wrap semua response dalam { success, data, timestamp }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    // Audit log otomatis untuk semua mutasi (POST/PATCH/PUT/DELETE)
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
