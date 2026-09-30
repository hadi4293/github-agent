import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `
تو دستیار هوشمند پروژه GitHub_agent هستی.
فعلاً فقط به سؤال‌ها پاسخ بده و هیچ تغییری در GitHub ایجاد نکن.
پاسخ‌ها را فارسی، کوتاه و کاربردی بنویس.
`,
    messages,
  });

  return result.toDataStreamResponse();
}