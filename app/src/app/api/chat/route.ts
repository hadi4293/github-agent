export const runtime = "nodejs";

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3-flash",
];

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "خطای ناشناخته رخ داد.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json(
        { ok: false, error: "پیام خالی است." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          ok: false,
          error:
            "کلید Gemini پیدا نشد. فایل .env.local را بررسی و سرور را ری‌استارت کن.",
        },
        { status: 500 },
      );
    }

    const errors: string[] = [];

    for (const model of MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `
تو GitHub Agent هستی؛ یک دستیار فارسی برای برنامه‌نویسی و تحلیل repository.

قوانین:
- فارسی، روشن، کوتاه و کاربردی پاسخ بده.
- اگر کاربر فایل یا اطلاعات repository را داخل پیام گذاشته، آن را تحلیل کن.
- اگر اطلاعات کافی نداری، دقیقاً بگو چه فایل یا اطلاعاتی لازم است.
- فعلاً هیچ تغییر واقعی در GitHub انجام نده.
- token، secret یا API key را درخواست یا نمایش نده.

پیام کاربر:
${message}
`,
                    },
                  ],
                },
              ],
            }),
          },
        );

        const rawText = await response.text();

        let data: GeminiResponse = {};

        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {
          errors.push(`${model}: پاسخ غیر JSON با HTTP ${response.status}`);
          continue;
        }

        if (!response.ok) {
          errors.push(
            `${model}: ${
              data.error?.message || `خطای HTTP ${response.status}`
            }`,
          );
          continue;
        }

        const answer = data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (!answer) {
          errors.push(`${model}: پاسخ متنی خالی بود.`);
          continue;
        }

        return Response.json({
          ok: true,
          answer,
          model,
        });
      } catch (error) {
        errors.push(`${model}: ${errorText(error)}`);
      }
    }

    return Response.json(
      {
        ok: false,
        error: "هیچ‌کدام از مدل‌های Gemini پاسخ ندادند.",
        details: errors,
      },
      { status: 503 },
    );
  } catch (error) {
    const message = errorText(error);

    console.error("CHAT API ERROR:", message);

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}