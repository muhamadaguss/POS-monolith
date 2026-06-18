import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { RequestIdHeaderMiddleware } from './common/middleware/request-id-header.middleware';
import { initSentry } from './observability/sentry';

async function bootstrap() {
  // Error tracking dipasang sebelum app dibuat (no-op bila SENTRY_DSN kosong).
  initSentry();

  const app = await NestFactory.create(AppModule, {
    // Buffer log sampai logger pino siap (lihat useLogger di bawah).
    bufferLogs: true,
  });

  // Alihkan semua Logger Nest ke pino (structured logging).
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;
  const frontendUrl = configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  const isProduction = process.env.NODE_ENV === 'production';

  // Propagate pino reqId ke response header X-Request-Id untuk trace correlation.
  // Dipasang SEBELUM helmet agar header tidak terblokir kebijakan CORP/CSP.
  app.use(new RequestIdHeaderMiddleware().use);

  // Security headers (helmet) — dipasang paling awal, sebelum route.
  // CSP dimatikan di non-production agar Swagger UI tetap berfungsi; di
  // production CSP default helmet aktif. HSTS hanya efektif di belakang
  // TLS/HTTPS (lihat konfigurasi reverse-proxy saat deployment).
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Parse cookie agar JwtStrategy bisa membaca access token dari cookie (opsional;
  // header Authorization tetap jalur utama). Mendukung migrasi frontend ke
  // auth cookie-based (Auth.js) tanpa mengubah kontrak Bearer yang sudah ada.
  app.use(cookieParser());

  // Global prefix untuk semua route: /api/v1/...
  app.setGlobalPrefix('api/v1');

  // CORS — izinkan frontend
  app.enableCors({
    origin: [frontendUrl],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Validasi input global (class-validator)
  app.useGlobalPipes(createValidationPipe());

  // Swagger — hanya aktif di luar production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Kasirku API')
      .setDescription(
        'Cloud-Based Multi-Tenant SaaS POS Platform — REST API Documentation\n\n' +
          '**Cara penggunaan:**\n' +
          '1. Login via `POST /api/v1/auth/login` → salin `accessToken`\n' +
          '2. Klik tombol **Authorize** di kanan atas → paste token\n' +
          '3. Semua request berikutnya otomatis menyertakan `Authorization: Bearer <token>`',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addTag('Auth', 'Login, logout, refresh token, pilih outlet')
      .addTag('Users', 'Manajemen pengguna & staf')
      .addTag('Outlets', 'Manajemen cabang / outlet')
      .addTag('Products', 'Katalog produk & kategori')
      .addTag('Inventory', 'Stok, opname, dan transfer antar cabang')
      .addTag('Shifts', 'Manajemen shift kasir')
      .addTag('Transactions', 'Transaksi POS — checkout & void')
      .addTag('Reports', 'Laporan penjualan, top produk, dan rekap shift')
      .addTag('Logs', 'Ingestion log dari client-side dan forwarding')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
    });

    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Kasirku API running on: http://localhost:${port}/api/v1`);
}

bootstrap();

// backend trigger
