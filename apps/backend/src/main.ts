import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = app.get(ConfigService);
  const port = config.get<number>('BACKEND_PORT', 4000);
  await app.listen(port);
  console.log(`API ready on http://localhost:${port}/api`);
}
bootstrap();

import { syncTelegram } from "./services/telegram-sync.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.BACKEND_PORT || 4000);

  // 🚀 автосинк каждые 10 минут
  if (process.env.TELEGRAM_SYNC_ENABLED === "true") {
    setInterval(() => {
      syncTelegram();
    }, 10 * 60 * 1000);

    syncTelegram();
  }
}
