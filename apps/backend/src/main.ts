import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;
  const frontendUrl = configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
    });

    console.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`Kasirku API running on: http://localhost:${port}/api/v1`);
}

bootstrap();
