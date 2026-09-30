"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Repo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updatedAt: string;
  defaultBranch: string;
  url: string;
};

type FileItem = {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  size?: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
};

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState("");
  const [repoSearch, setRepoSearch] = useState("");

  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");

  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "سلام! یک repository انتخاب کن، فایل‌های آن را باز کن، یا درباره برنامه‌نویسی سؤال بپرس.",
    },
  ]);

  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const filteredRepos = useMemo(() => {
    const query = repoSearch.trim().toLowerCase();

    if (!query) return repos;

    return repos.filter((repo) => {
      const text = `${repo.name} ${repo.fullName}`.toLowerCase();
      return text.includes(query);
    });
  }, [repos, repoSearch]);

  async function readJson(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    const rawText = await response.text();

    let data: Record<string, unknown> = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`پاسخ سرور JSON معتبر نبود. کد: ${response.status}`);
    }

    if (!response.ok || data.ok === false) {
      const error =
        typeof data.error === "string"
          ? data.error
          : `درخواست ناموفق بود. کد: ${response.status}`;

      throw new Error(error);
    }

    return data;
  }

  async function loadRepos() {
    setReposLoading(true);
    setReposError("");

    try {
      const data = await readJson("/api/github/repos");

      const list = Array.isArray(data.repositories)
        ? (data.repositories as Repo[])
        : [];

      setRepos(list);
    } catch (error) {
      setReposError(
        error instanceof Error
          ? error.message
          : "خطا هنگام دریافت repositoryها.",
      );
    } finally {
      setReposLoading(false);
    }
  }

  async function loadPath(repo: Repo, path = "") {
    setFilesLoading(true);
    setFilesError("");
    setSelectedFile(null);

    try {
      const [owner, repoName] = repo.fullName.split("/");

      const params = new URLSearchParams();
      params.set("owner", owner);
      params.set("repo", repoName);
      params.set("path", path);
      params.set("ref", repo.defaultBranch);

      const data = await readJson(
        `/api/github/contents?${params.toString()}`,
      );

      if (data.kind === "directory") {
        const items = Array.isArray(data.items)
          ? (data.items as FileItem[])
          : [];

        setFiles(items);
        setCurrentPath(path);
        return;
      }

      if (data.kind === "file") {
        setSelectedFile({
          path: typeof data.path === "string" ? data.path : path,
          content: typeof data.content === "string" ? data.content : "",
        });
      }
    } catch (error) {
      setFilesError(
        error instanceof Error
          ? error.message
          : "خطا هنگام دریافت فایل‌ها.",
      );
    } finally {
      setFilesLoading(false);
    }
  }

  function selectRepo(repo: Repo) {
    setSelectedRepo(repo);
    setCurrentPath("");
    setFiles([]);
    setSelectedFile(null);

    loadPath(repo, "");
  }

  function goUp() {
    if (!selectedRepo || !currentPath) return;

    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();

    loadPath(selectedRepo, parts.join("/"));
  }

  async function sendMessage(text: string) {
    const content = text.trim();

    if (!content || chatLoading) return;

    const contextParts = [
      selectedRepo
        ? `Repository انتخاب‌شده: ${selectedRepo.fullName}`
        : "",
      selectedFile
        ? `فایل انتخاب‌شده: ${selectedFile.path}

محتوای فایل:
${selectedFile.content.slice(0, 12000)}`
        : "",
      `درخواست کاربر: ${content}`,
    ];

    const context = contextParts.filter(Boolean).join(" | ");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setChatError("");
    setChatLoading(true);

    try {
      const data = await readJson("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: context,
        }),
      });

      const answer =
        typeof data.answer === "string" ? data.answer : "پاسخ خالی بود.";

      const model = typeof data.model === "string" ? data.model : "";

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          model,
        },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "خطا هنگام ارتباط با Gemini.",
      );
    } finally {
      setChatLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  useEffect(() => {
    loadRepos();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-[#0b1220] p-4 lg:flex lg:flex-col">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">GitHub Agent</h1>
              <p className="text-xs text-slate-400">Dashboard</p>
            </div>

            <button
              type="button"
              onClick={loadRepos}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              بروزرسانی
            </button>
          </div>

          <input
            value={repoSearch}
            onChange={(event) => setRepoSearch(event.target.value)}
            placeholder="جست‌وجوی repository…"
            className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50"
          />

          <div className="mb-2 text-[11px] font-bold tracking-wider text-slate-500">
            REPOSITORIES
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {reposLoading && (
              <p className="p-3 text-sm text-slate-400">
                در حال دریافت repositoryها…
              </p>
            )}

            {reposError && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs leading-5 text-red-200">
                {reposError}
              </div>
            )}

            {!reposLoading &&
              !reposError &&
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => selectRepo(repo)}
                  className={`w-full rounded-xl border p-3 text-right transition ${
                    selectedRepo?.id === repo.id
                      ? "border-violet-400/50 bg-violet-500/15"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {repo.name}
                    </span>

                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {repo.private ? "Private" : "Public"}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {repo.language || "بدون زبان مشخص"}
                  </p>
                </button>
              ))}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
            GitHub API متصل است
          </div>
        </aside>

        <section className="hidden w-80 shrink-0 border-l border-white/10 bg-[#0a101c] xl:flex xl:flex-col">
          <div className="border-b border-white/10 p-4">
            <p className="truncate text-sm font-bold">
              {selectedRepo ? selectedRepo.name : "فایل‌ها"}
            </p>

            <p className="mt-1 truncate text-xs text-slate-500">
              {selectedRepo
                ? currentPath || "/"
                : "یک repository انتخاب کن"}
            </p>
          </div>

          {selectedRepo && currentPath && (
            <button
              type="button"
              onClick={goUp}
              className="m-3 rounded-lg border border-white/10 px-3 py-2 text-right text-xs text-slate-300 hover:bg-white/5"
            >
              ← پوشه بالاتر
            </button>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {filesLoading && (
              <p className="p-2 text-sm text-slate-400">
                در حال دریافت فایل‌ها…
              </p>
            )}

            {filesError && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs leading-5 text-red-200">
                {filesError}
              </div>
            )}

            {!filesLoading &&
              !filesError &&
              files.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => {
                    if (!selectedRepo) return;
                    loadPath(selectedRepo, file.path);
                  }}
                  className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs transition ${
                    selectedFile?.path === file.path
                      ? "bg-violet-500/15 text-violet-200"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="text-slate-500">
                    {file.type === "dir" ? "▣" : "▤"}
                  </span>

                  <span className="truncate">{file.name}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#0b1220]/80 px-4 py-4 backdrop-blur md:px-7">
            <div>
              <h2 className="text-sm font-bold">
                {selectedRepo
                  ? selectedRepo.fullName
                  : "گفت‌وگو با GitHub Agent"}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {selectedFile
                  ? `فایل فعال: ${selectedFile.path}`
                  : selectedRepo
                    ? `Branch: ${selectedRepo.defaultBranch}`
                    : "یک repository را انتخاب کن یا سؤال بپرس"}
              </p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              Gemini Ready
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-4xl space-y-5">
              {selectedFile && (
                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="truncate text-xs font-semibold text-slate-300">
                      {selectedFile.path}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        sendMessage(
                          "این فایل را بررسی کن، هدفش را توضیح بده و مشکلات احتمالی‌اش را بگو.",
                        );
                      }}
                      disabled={chatLoading}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      تحلیل فایل
                    </button>
                  </div>

                  <pre
                    className="max-h-64 overflow-auto p-4 text-left text-xs leading-6 text-slate-300"
                    dir="ltr"
                  >
                    {selectedFile.content.slice(0, 15000)}
                  </pre>
                </section>
              )}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-violet-600 text-white"
                        : "rounded-tl-sm border border-white/10 bg-white/[0.045] text-slate-200"
                    }`}
                  >
                    {message.content}

                    {message.model && (
                      <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-slate-400">
                        مدل: {message.model}
                      </p>
                    )}
                  </div>
                </article>
              ))}

              {chatLoading && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-slate-400">
                    Gemini در حال پاسخ است…
                  </div>
                </div>
              )}

              {chatError && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-200">
                  {chatError}
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-white/10 bg-[#0b1220]/80 p-4 backdrop-blur md:px-8">
            <form
              onSubmit={submit}
              className="mx-auto flex max-w-4xl items-end gap-3 rounded-2xl border border-white/10 bg-[#111a2b] p-2 focus-within:border-violet-400/50"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={
                  selectedFile
                    ? "درباره فایل فعال سؤال بپرس…"
                    : "پیامت را بنویس…"
                }
                rows={1}
                disabled={chatLoading}
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || chatLoading}
                className="grid h-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                ارسال
              </button>
            </form>

            <p className="mx-auto mt-3 max-w-4xl text-center text-[11px] text-slate-500">
              نسخه پایه پایدار · عملیات GitHub فعلاً فقط خواندنی است
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}