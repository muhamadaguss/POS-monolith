import { ValidationPipe } from '@nestjs/common';

/**
 * Factory ValidationPipe global (class-validator) yang dipakai seragam di
 * seluruh app — di-wire pada main.ts dan direplikasi di e2e test.
 *
 * Catatan: validasi memakai class-validator + class-transformer (DTO berdekorasi),
 * BUKAN zod. Status error sengaja 422 (Unprocessable Entity), bukan 400.
 */
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true, // strip properti yang tidak ada di DTO
    forbidNonWhitelisted: true, // error jika ada properti ekstra
    transform: true, // auto-transform tipe (string → number, dsb)
    transformOptions: { enableImplicitConversion: true },
    errorHttpStatusCode: 422,
  });
