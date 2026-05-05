import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY не задан — AI отключен');
      return;
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async parse(text: string) {
    // 👉 если AI отключен — не падаем!
    if (!this.openai) {
      return {
        title: text.slice(0, 50),
        city: null,
        date: null,
        time: null,
        format: null,
        isFree: false,
        link: null,
      };
    }

    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `
Извлеки данные события и верни JSON:

{
  "title": "",
  "city": "",
  "date": "",
  "time": "",
  "isFree": true,
  "link": ""
}
`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });

      return JSON.parse(res.choices[0]?.message?.content || '{}');
    } catch (e) {
      this.logger.error('Ошибка AI парсинга', e as any);
      return null;
    }
  }
}