import { Octokit } from "octokit";

export const runtime = "nodejs";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "خطای ناشناخته هنگام دریافت repositoryها.";
}

export async function GET() {
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

    const github = new Octokit({ auth: token });

    const repositories = await github.paginate(
      github.rest.repos.listForAuthenticatedUser,
      {
        visibility: "all",
        affiliation: "owner,collaborator,organization_member",
        per_page: 100,
        sort: "updated",
        direction: "desc",
      },
    );

    return Response.json({
      ok: true,
      repositories: repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        language: repo.language,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
        url: repo.html_url,
      })),
    });
  } catch (error) {
    const message = errorText(error);

    console.error("GITHUB REPOS ERROR:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}