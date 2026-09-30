import { Octokit } from "octokit";

export const runtime = "nodejs";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "خطای ناشناخته هنگام دریافت فایل‌ها.";
}

export async function GET(request: Request) {
  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return Response.json(
        {
          ok: false,
          error: "GITHUB_TOKEN در فایل .env.local تنظیم نشده است.",
        },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);

    const owner = searchParams.get("owner")?.trim() || "";
    const repo = searchParams.get("repo")?.trim() || "";
    const path = searchParams.get("path")?.trim() || "";
    const ref = searchParams.get("ref")?.trim() || undefined;

    if (!owner || !repo) {
      return Response.json(
        {
          ok: false,
          error: "owner و repo باید مشخص باشند.",
        },
        { status: 400 },
      );
    }

    const github = new Octokit({ auth: token });

    const { data } = await github.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data)) {
      return Response.json({
        ok: true,
        kind: "directory",
        path,
        items: data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
        })),
      });
    }

    if (data.type !== "file") {
      return Response.json(
        {
          ok: false,
          error: "این مسیر یک فایل متنی قابل‌خواندن نیست.",
        },
        { status: 400 },
      );
    }

    const content = Buffer.from(data.content, "base64").toString("utf8");

    return Response.json({
      ok: true,
      kind: "file",
      path: data.path,
      name: data.name,
      sha: data.sha,
      size: data.size,
      content,
    });
  } catch (error) {
    const message = errorText(error);

    console.error("GITHUB CONTENTS ERROR:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}