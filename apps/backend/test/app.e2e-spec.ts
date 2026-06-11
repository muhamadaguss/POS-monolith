import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/pipes/validation.pipe';

/**
 * Smoke e2e: memastikan aplikasi boot + pipeline global aktif.
 * Sengaja menguji perilaku yang TIDAK menyentuh DB (guard & validation pipe
 * berjalan sebelum service/Prisma), agar test hermetik tanpa database.
 */
describe('App pipeline (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Replikasi setup main.ts yang relevan untuk pipeline.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('global JwtAuthGuard menolak route terproteksi tanpa token → 401', () => {
    return request(app.getHttpServer()).get('/api/v1/products').expect(401);
  });

  it('route @Public (login) dapat diakses tanpa token (tidak 401 dari guard)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email', password: '' })
      .expect((res) => {
        if (res.status === 401) {
          throw new Error('Login seharusnya publik, tidak boleh 401 dari guard');
        }
      });
  });

  it('validation pipe menolak body login yang tidak valid → 422', () => {
    // Pipe global dikonfigurasi errorHttpStatusCode: 422 (lihat validation.pipe).
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bukan-email', password: 123, fieldEkstra: 'x' })
      .expect(422);
  });
});
