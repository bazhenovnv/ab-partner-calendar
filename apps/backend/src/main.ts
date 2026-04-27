import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { syncTelegram } from './services/telegram-sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.BACKEND_PORT || 4000);

  console.log(`🚀 Backend started on port ${process.env.BACKEND_PORT || 4000}`);

  // 🔄 авто-синхронизация Telegram
  if (process.env.TELEGRAM_SYNC_ENABLED === "true") {
    console.log("📡 Telegram sync enabled");

    setInterval(() => {
      syncTelegram();
    }, 10 * 60 * 1000);

    syncTelegram();
  }
}

bootstrap();