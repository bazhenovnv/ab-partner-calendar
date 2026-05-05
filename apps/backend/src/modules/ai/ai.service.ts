import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async parse(text: string) {
    // заглушка, чтобы CI не падал
    return {
      title: text.slice(0, 50),
      description: text,
    };
  }
}