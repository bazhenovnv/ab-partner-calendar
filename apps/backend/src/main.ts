import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelegramSyncService } from './services/telegram-sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.BACKEND_PORT || 4000);

  const syncService = app.get(TelegramSyncService);

  if (process.env.TELEGRAM_SYNC_ENABLED === 'true') {
    setInterval(() => {
      syncService.sync();
    }, 10 * 60 * 1000);

    syncService.sync();
  }

  console.log('🚀 Backend started');
}

bootstrap();