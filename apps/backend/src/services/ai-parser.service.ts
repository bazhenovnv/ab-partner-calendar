import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function aiParseEvent(text: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-5.3",
    messages: [{
      role: "user",
      content: РР·РІР»РµРєРё СЃРѕР±С‹С‚РёРµ JSON: title, city, date, timeFrom, format, isFree, link\n
    }],
    temperature: 0,
  });

  try {
    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return null;
  }
}
