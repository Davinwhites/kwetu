import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { consumeAi } from "@/lib/data/billing";
import { getSql } from "@/lib/db";

type StudentInput = {
  question: string;
  course: string;
  level: string;
  institution?: string;
  mode: "research" | "explain" | "coursework" | "code" | "image";
  image?: { mimeType: string; data: string; name: string };
};

type Source = { title: string; url: string; snippet: string };

export type StudentResult = {
  answer: string;
  sources: Source[];
  notice?: string;
  generatedImage?: { mimeType: string; data: string };
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

async function generate(system: string, prompt: string, image?: StudentInput["image"]) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiKey) return { ok: false as const, error: "AI is not configured on this deployment." };
  const userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
  if (image) userParts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  const requestBody = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: userParts }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 1800 },
  };
  let res: Response | null = null;
  for (const model of ["gemma-4-26b-a4b-it", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify(requestBody),
    });
    if (res.status !== 404) break;
  }
  if (!res) return { ok: false as const, error: "AI request could not be sent." };
  if (!res.ok) {
    if (res.status === 429) return { ok: false as const, error: "AI is busy right now — try again in a moment." };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false as const, error: "The configured Gemini API key is invalid or unavailable." };
    }
    if (res.status === 404) {
      return { ok: false as const, error: "Gemini is unavailable for the configured API key. Replace GEMINI_API_KEY with a valid Google AI Studio key." };
    }
    return { ok: false as const, error: `AI error ${res.status}` };
  }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  return text ? { ok: true as const, text } : { ok: false as const, error: "Empty model response" };
}

async function generateImage(prompt: string) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiKey) return { ok: false as const, error: "AI is not configured on this deployment." };
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
  });
  if (!response.ok) return { ok: false as const, error: response.status === 429 ? "Image generation is busy right now — try again in a moment." : `Image generation failed (${response.status}).` };
  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[] };
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  const generatedImage = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!generatedImage?.data || !generatedImage.mimeType) return { ok: false as const, error: "The image model returned no image. Try a more specific prompt." };
  return { ok: true as const, image: { mimeType: generatedImage.mimeType, data: generatedImage.data }, text: parts.find((part) => part.text)?.text?.trim() ?? "Generated image based on your request." };
}

function memoryId() {
  return crypto.randomUUID();
}

export const listStudentMemories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql.query<{ id: string; memory: string; updated_at: number }>(
      "select id, memory, updated_at from ai_memories where user_id = $1 order by updated_at desc limit 50",
      [context.userId],
    );
  });

export const forgetStudentMemory = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query("delete from ai_memories where id = $1 and user_id = $2", [data.id, context.userId]);
    return { ok: true as const };
  });

export const runStudentAi = createServerFn({ method: "POST" })
  .validator((input: StudentInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const question = data.question.trim().slice(0, 5000);
    if (question.length < 8 && !data.image) return { ok: false as const, error: "Ask a question or upload an image to review first." };
    if (data.image && (!data.image.mimeType.startsWith("image/") || data.image.data.length > 8_000_000)) return { ok: false as const, error: "Use an image under 6 MB." };
    const gate = await consumeAi(context.userId, "student");
    if (!gate.ok) return gate;
    const sql = await getSql();
    const savedMemory = /^(remember|always remember|please remember)\s*[:,-]?\s*(.+)$/i.exec(question);
    if (savedMemory?.[2]) {
      const now = Date.now();
      await sql.query("insert into ai_memories (id, user_id, memory, created_at, updated_at) values ($1, $2, $3, $4, $5)", [memoryId(), context.userId, savedMemory[2].trim().slice(0, 500), now, now]);
    }
    const memories = await sql.query<{ memory: string }>("select memory from ai_memories where user_id = $1 order by updated_at desc limit 50", [context.userId]);
    const memoryContext = memories.length ? `Persistent user instructions to honour when relevant:\n${memories.map((item) => `- ${item.memory}`).join("\\n")}` : "No persistent user instructions have been saved.";
    if (data.mode === "image") {
      const generated = await generateImage(question);
      if (!generated.ok) return generated;
      return { ok: true as const, kind: "student" as const, student: { answer: generated.text, sources: [], notice: "Generated by the image model. Review it before using it in coursework.", generatedImage: generated.image } satisfies StudentResult };
    }
    const sources = data.mode === "research" || data.mode === "coursework" ? await research(question, data.course) : [];
    const sourceContext = sources.length ? `Verified research leads (cite only these when relevant):\n${sources.map((s) => `- ${s.title}: ${s.snippet} (${s.url})`).join("\n")}` : "No live sources were available; be transparent and rely on established knowledge.";
    const guardrail = "You are a university study assistant. Help the student learn; do not impersonate a student, fabricate citations, or complete graded work dishonestly. You may explain concepts, outline answers, review drafts, and provide small focused code examples. Refuse requests to build a complete website or app, and instead offer a scoped learning exercise. Never claim live verification beyond the supplied sources. If sources are supplied, cite them clearly inline using [1], [2], and so on, and end with a Sources section that lists only the supplied URLs. If no sources are supplied, say that no live sources were available instead of inventing citations.";
    const result = await generate(`${guardrail} ${memoryContext} Course: ${data.course}. Level: ${data.level}. Institution: ${data.institution || "not provided"}. Mode: ${data.mode}. Use clear headings, examples, and British English. ${data.image ? "Review the uploaded image carefully and follow the student's instructions about it. Describe uncertainty when text or details are unreadable." : ""} ${sourceContext}`, question || "Review the uploaded image and explain what is important for my course.", data.image);
    if (!result.ok) return result;
    return { ok: true as const, kind: "student" as const, student: { answer: result.text, sources, notice: sources.length ? "Answer informed by live research leads. Check the linked sources before submitting coursework." : "Use this as a study aid and verify important claims with your lecturer or library sources." } satisfies StudentResult };
  });

export type { StudentInput };
