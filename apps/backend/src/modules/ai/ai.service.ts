import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async parse(text: string) {
    return {
      title: text.slice(0, 50),
      description: text,
    };
  }
}