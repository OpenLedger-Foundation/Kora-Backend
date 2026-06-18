import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kora Protocol API')
    .setDescription('Backend API for Kora — decentralized invoice financing on Stellar Soroban')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Wallet-based authentication')
    .addTag('invoices', 'Invoice lifecycle management')
    .addTag('marketplace', 'Invoice marketplace and funding')
    .addTag('ipfs', 'IPFS / Pinata file storage')
    .addTag('stellar', 'Stellar / Soroban contract interactions')
    .addTag('analytics', 'Portfolio and protocol analytics')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`🚀 Kora API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
