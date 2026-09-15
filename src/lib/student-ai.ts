import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { consumeAi } from "@/lib/data/billing";

type StudentInput = {
  question: string;
  course: string;
  level: string;
  institution?: string;
  mode: "research" | "explain" | "coursework" | "code";
};

type Source = { title: string; url: string; snippet: string };

export type StudentResult = {
  answer: string;
  sources: Source[];
  notice?: string;
};

async function research(question: string, course: string) {
  const query = encodeURIComponent(`${course} ${question}`.slice(0, 240));
  const sources: Source[] = [];
  try {
    const wiki = await fetch(`https://en.wikipedia.org/api/rest_v1/page/search/title?q=${query}&limit=3`, {
      headers: { accept: "application/json" },
    });
    if (wiki.ok) {
      const body = (await wiki.json()) as { pages?: { title?: string; excerpt?: string; key?: string }[] };
      for (const page of body.pages ?? []) {
        if (page.title && page.key) sources.push({ title: page.title, url: `https://en.wikipedia.org/wiki/${page.key}`, snippet: (page.excerpt ?? "").replace(/<[^>]+>/g, "").slice(0, 220) });
      }
    }
  } catch {
    // Research is an enhancement; the answer can still be generated when a source is unavailable.
  }
  return sources.slice(0, 3);
}

async function generate(system: string, prompt: string) {
  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 1800,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) return { ok: false as const, error: "AI is busy right now — try again in a moment." };
    return { ok: false as const, error: `AI error ${res.status}` };
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  return text ? { ok: true as const, text } : { ok: false as const, error: "Empty model response" };
}

export const runStudentAi = createServerFn({ method: "POST" })
  .validator((input: StudentInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const question = data.question.trim().slice(0, 5000);
    if (question.length < 8) return { ok: false as const, error: "Ask a more specific question first." };
    const gate = await consumeAi(context.userId, "student");
    if (!gate.ok) return gate;
    const sources = data.mode === "research" || data.mode === "coursework" ? await research(question, data.course) : [];
    const sourceContext = sources.length ? `Verified research leads (cite only these when relevant):\n${sources.map((s) => `- ${s.title}: ${s.snippet} (${s.url})`).join("\n")}` : "No live sources were available; be transparent and rely on established knowledge.";
    const guardrail = "You are a university study assistant. Help the student learn; do not impersonate a student, fabricate citations, or complete graded work dishonestly. You may explain concepts, outline answers, review drafts, and provide small focused code examples. Refuse requests to build a complete website or app, and instead offer a scoped learning exercise. Never claim live verification beyond the supplied sources.";
    const result = await generate(`${guardrail} Course: ${data.course}. Level: ${data.level}. Institution: ${data.institution || "not provided"}. Mode: ${data.mode}. Use clear headings, examples, and British English. ${sourceContext}`, question);
    if (!result.ok) return result;
    return { ok: true as const, kind: "student" as const, student: { answer: result.text, sources, notice: sources.length ? "Answer informed by live research leads. Check the linked sources before submitting coursework." : "Use this as a study aid and verify important claims with your lecturer or library sources." } satisfies StudentResult };
  });

export type { StudentInput };
