import { aiParseEvent } from "./ai-parser.service";

export async function parseEventSmart(text: string) {
  const ai = await aiParseEvent(text);
  if (ai && ai.title) return ai;

  return {
    title: text.slice(0,120),
    description: text
  };
}
