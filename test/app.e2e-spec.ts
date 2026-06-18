import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Kora Backend (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/challenge — returns nonce for valid key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/challenge')
        .send({ walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' })
        .expect(201);
      expect(res.body.data.nonce).toBeDefined();
    });

    it('POST /api/v1/auth/challenge — rejects invalid key', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/challenge')
        .send({ walletAddress: 'not-a-key' })
        .expect(401);
    });
  });

  describe('Invoices', () => {
    it('GET /api/v1/invoices — returns paginated list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/invoices').expect(200);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('Analytics', () => {
    it('GET /api/v1/analytics/protocol — returns stats', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/analytics/protocol').expect(200);
      expect(res.body.data).toHaveProperty('totalInvoices');
    });

    it('GET /api/v1/analytics/risk — returns distribution', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/analytics/risk').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
