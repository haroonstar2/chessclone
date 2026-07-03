import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply validation pipe globally to block requested with extra fields
  // Block requests reutrn a HTTP 400 (Bad request) code
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforms JSON to DTO
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
