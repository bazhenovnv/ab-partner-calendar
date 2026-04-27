import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedEvent {
  title?: string;
  city?: string;
  date?: string;
  timeFrom?: string;
  format?: "online" | "offline" | "hybrid";
  isFree?: boolean;
  link?: string;
}

export async function aiParseEvent(text: string): Promise<ParsedEvent | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Ты парсер событий. Извлеки данные из текста и верни строго JSON без комментариев.",
        },
        {
          role: "user",
          content: `
Разбери событие и верни JSON:

Поля:
- title (название)
- city (город)
- date (дата)
- timeFrom (время)
- format (online/offline/hybrid)
- isFree (true/false)
- link (ссылка)

Текст:
${text}
          `,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";

    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", content);
      return null;
    }
  } catch (error) {
    console.error("AI parse error:", error);
    return null;
  }
}