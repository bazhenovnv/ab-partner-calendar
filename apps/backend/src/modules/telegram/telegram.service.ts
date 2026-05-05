import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramService {
  async sync() {
    return { success: true };
  }
}