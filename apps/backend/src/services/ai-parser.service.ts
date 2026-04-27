import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ParsedEvent = {
  title: string;
  city?: string;
  date?: string;
  time?: string;
  format?: string;
  isFree?: boolean;
  link?: string;
};

export async function aiParseEvent(text: string): Promise<ParsedEvent | null> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Ты парсер событий. Извлеки данные из текста.
Верни строго JSON:

{
  "title": "",
  "city": "",
  "date": "",
  "time": "",
  "format": "",
  "isFree": true/false,
  "link": ""
}
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const content = res.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (e) {
    console.error("AI parse error:", e);
    return null;
  }
}