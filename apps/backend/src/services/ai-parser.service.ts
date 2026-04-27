import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type ParsedEvent = {
  title: string;
  city?: string;
  date?: string;
  time?: string;
  format?: string;
  isFree?: boolean;
  link?: string;
};

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parse(text: string): Promise<ParsedEvent | null> {
    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `
Ты парсер событий. Из текста извлеки структуру.

Верни строго JSON:

{
  "title": "string",
  "city": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "format": "online/offline",
  "isFree": true,
  "link": "url"
}
`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });

      const content = res.choices[0]?.message?.content ?? '{}';

      const parsed = JSON.parse(content);

      return parsed;
    } catch (e) {
      this.logger.error('AI parse error', e as any);
      return null;
    }
  }
}