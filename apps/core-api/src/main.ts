import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

import { ValidationPipe } from '@nestjs/common';

import { PrismaExceptionFilter } from './prisma/prisma-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Register the Prisma exception filter globally
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Get allowed origins from environment variable
  const allowedOrigin =
    (configService.get('FRONTEND_URL') as string) || 'http://localhost:8080'; // Default to localhost if not set

  // Enable CORS for the frontend application
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin or if the origin exists in the allowed list
      if (!origin || allowedOrigin.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  });

  // Apply validation pipe globally to block requested with extra fields
  // Block requests return a HTTP 400 (Bad request) code
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforms JSON to DTO
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
