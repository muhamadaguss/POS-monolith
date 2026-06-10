import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

// Re-export configured ValidationPipe agar konsisten di seluruh app
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,           // strip properti yang tidak ada di DTO
    forbidNonWhitelisted: true, // error jika ada properti ekstra
    transform: true,            // auto-transform tipe (string → number, dsb)
    transformOptions: { enableImplicitConversion: true },
    errorHttpStatusCode: 422,
  });
