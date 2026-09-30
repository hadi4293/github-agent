"use client";

import { useChat } from "ai/react";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, status } =
    useChat();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-6">
      <h1 className="mb-6 text-3xl font-bold">
        GitHub_agent
      </h1>

      <div className="flex-1 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border p-4">
            <p className="mb-2 font-bold">
              {message.role === "user" ? "شما" : "ایجنت"}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="مثلاً: خودت را معرفی کن"
          className="flex-1 rounded-lg border p-3"
        />

        <button
          type="submit"
          disabled={status === "streaming"}
          className="rounded-lg bg-black px-5 py-3 text-white"
        >
          ارسال
        </button>
      </form>
    </main>
  );
}