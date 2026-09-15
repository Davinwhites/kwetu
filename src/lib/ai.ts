import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { consumeAi } from "@/lib/data/billing";
import type { CV } from "@/lib/cv/types";
import { CATEGORIES } from "@/lib/cv/categories";

type RewriteInput = {
  task: "rewrite";
  text: string;
  role?: string;
  company?: string;
  job?: string;
};

type ReviewInput = {
  task: "review";
  cv: CV;
  job?: string;
};

type TailorInput = {
  task: "tailor";
  cv: CV;
  job: string;
};

type ComposeInput = {
  task: "compose";
  notes: string;
  category: string;
  title?: string;
  fullName?: string;
};

type LetterInput = {
  task: "letter";
  cv: CV;
  job: string;
};

type ScanInput = {
  task: "scan";
  image: string;
};

type InterviewMessage = {
  question: string;
  answer: string;
  score?: number;
  feedback?: string;
};

type InterviewInput = {
  task: "interview";
  mode: "start" | "answer";
  cv: CV;
  job?: string;
  question?: string;
  answer?: string;
  history?: InterviewMessage[];
};

export type AiInput = RewriteInput | ReviewInput | TailorInput | ComposeInput | LetterInput | ScanInput | InterviewInput;

export type ReviewIssue = {
  severity: "high" | "med" | "low";
  title: string;
  fix: string;
};

export type ReviewResult = {
  score: number;
  summary: string;
  issues: ReviewIssue[];
};

export type TailorResult = {
  summary: string;
  bullets: { id: string; index: number; suggested: string }[];
  note: string;
};

export type ScanResult = {
  fullName: string;
  dateOfBirth: string;
  nin: string;
  nationality: string;
  gender: string;
  cardNumber: string;
};

export type InterviewResult = {
  phase: "question" | "complete";
  question: string;
  questionType: "general" | "behavioral" | "technical" | "situational";
  score: number | null;
  feedback: string;
  strengths: string[];
  improvements: string[];
  followUp: string;
  tip: string;
  overallScore: number | null;
};

export type ComposeResult = {
  title: string;
  summary: string;
  experience: { company: string; role: string; location: string; start: string; end: string; current: boolean; bullets: string[] }[];
  education: { school: string; degree: string; field: string; start: string; end: string; details: string }[];
  skills: { category: string; items: string }[];
  extras: { label: string; value: string }[];
};

function compactCv(cv: CV) {
  return {
    name: cv.personal.fullName,
    title: cv.personal.title,
    location: cv.personal.location,
    nationality: cv.personal.nationality,
    summary: cv.summary.slice(0, 800),
    category: cv.category,
    experience: cv.experience.slice(0, 5).map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      dates: `${e.start}–${e.current ? "now" : e.end}`,
      bullets: e.bullets.filter(Boolean).slice(0, 6),
    })),
    education: cv.education.slice(0, 3).map((e) => ({
      school: e.school,
      degree: `${e.degree} ${e.field}`.trim(),
    })),
    skills: cv.skills.map((s) => `${s.category}: ${s.items}`).slice(0, 6),
    referees: cv.referees.filter((r) => r.name).map((r) => r.name).slice(0, 3),
  };
}

async function chat(
  system: string,
  user: string,
  maxTokens: number,
  image?: string,
) {
  // Google Gemini's free tier (Gemini 2.5 Flash), called on the *native*
  // endpoint. Google's newer "Auth key" format (issued by default since
  // mid-2026, prefixed "AQ.") is rejected by the OpenAI-compatibility shim
  // (401 ACCESS_TOKEN_TYPE_UNSUPPORTED) — only the native generateContent
  // endpoint accepts it, so that's what this calls. Works the same for
  // older "AIza..." keys too. Get a key with no card at
  // https://aistudio.google.com — set it as GEMINI_API_KEY.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false as const, error: "AI is not available in this environment" };

  const parts: Record<string, unknown>[] = [{ text: user }];
  if (image) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );
  if (!res.ok) {
    if (res.status === 429) {
      return { ok: false as const, error: "AI is busy right now — try again in a moment." };
    }
    return { ok: false as const, error: `AI error ${res.status}` };
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!text) return { ok: false as const, error: "Empty model response" };
  return { ok: true as const, text };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object");
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

const UG_SYSTEM =
  "You write CVs for the Ugandan job market (Kampala, districts, NGOs, public service, banks, hospitals). Use UGX not USD unless the source used dollars. Prefer Makerere, Kyambogo, MUBS, UCU, Ndejje spelling. Never invent employers, dates, grades, or numbers that are not in the source. British English. No first person. No quotes around the answer.";

export const runCvAi = createServerFn({ method: "POST" })
  .validator((input: AiInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const gate = await consumeAi(context.userId, data.task === "scan" ? "scan" : data.task);
    if (!gate.ok) return gate;

    if (data.task === "rewrite") {
      const text = data.text.trim().slice(0, 600);
      if (!text) return { ok: false as const, error: "Nothing to rewrite" };
      const job = data.job?.trim().slice(0, 800) ?? "";
      const result = await chat(
        `${UG_SYSTEM} Rewrite one bullet or summary. Start with a strong action verb; quantify only using numbers already present; one or two sentences max; return only the rewritten text.`,
        [
          data.role ? `Role: ${data.role}` : "",
          data.company ? `Company: ${data.company}` : "",
          job ? `Target role notes: ${job}` : "",
          `Text:\n${text}`,
        ]
          .filter(Boolean)
          .join("\n"),
        220,
      );
      if (!result.ok) return result;
      return { ok: true as const, kind: "rewrite" as const, text: result.text.replace(/^["']|["']$/g, "") };
    }

    if (data.task === "review") {
      const job = data.job?.trim().slice(0, 1200) ?? "";
      const result = await chat(
        `${UG_SYSTEM} You are a hiring manager in Uganda and an ATS coach. Return JSON only: {"score":0-100,"summary":"2 sentences","issues":[{"severity":"high|med|low","title":"short","fix":"actionable"}]} . Be specific to this CV. Max 6 issues. Flag missing referees, missing passport photo, missing nationality when the target is public service or NGO.`,
        JSON.stringify({ cv: compactCv(data.cv), job: job || undefined }),
        900,
      );
      if (!result.ok) return result;
      try {
        const parsed = extractJson(result.text) as ReviewResult;
        return {
          ok: true as const,
          kind: "review" as const,
          review: {
            score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
            summary: String(parsed.summary ?? "").slice(0, 600),
            issues: Array.isArray(parsed.issues)
              ? parsed.issues.slice(0, 6).map((i) => ({
                  severity: (i.severity === "high" || i.severity === "low" ? i.severity : "med") as
                    | "high"
                    | "med"
                    | "low",
                  title: String(i.title ?? "").slice(0, 80),
                  fix: String(i.fix ?? "").slice(0, 240),
                }))
              : [],
          },
        };
      } catch {
        return { ok: false as const, error: "Could not parse the review" };
      }
    }

    if (data.task === "tailor") {
      const job = data.job.trim().slice(0, 1400);
      if (!job) return { ok: false as const, error: "Paste a job description first" };
      const result = await chat(
        `${UG_SYSTEM} Retarget a CV toward a job without inventing experience. Return JSON only: {"note":"1 sentence","summary":"rewritten summary","bullets":[{"id":"experience id","index":0,"suggested":"bullet"}]} . Only rewrite existing bullets (use their id and 0-based index). Max 8 bullets. Keep true facts.`,
        JSON.stringify({ cv: compactCv(data.cv), job }),
        1100,
      );
      if (!result.ok) return result;
      try {
        const parsed = extractJson(result.text) as TailorResult;
        return {
          ok: true as const,
          kind: "tailor" as const,
          tailor: {
            note: String(parsed.note ?? "").slice(0, 280),
            summary: String(parsed.summary ?? "").slice(0, 700),
            bullets: Array.isArray(parsed.bullets)
              ? parsed.bullets.slice(0, 8).map((b) => ({
                  id: String(b.id ?? ""),
                  index: Number(b.index) || 0,
                  suggested: String(b.suggested ?? "").slice(0, 280),
                }))
              : [],
          },
        };
      } catch {
        return { ok: false as const, error: "Could not parse the tailor result" };
      }
    }

    if (data.task === "letter") {
      const job = data.job.trim().slice(0, 1600);
      if (!job) return { ok: false as const, error: "Paste the job advert first" };
      const result = await chat(
        `${UG_SYSTEM} Write a one-page cover letter for a Ugandan application. Address it to The Hiring Manager if no name is given. Structure: opening with the role, two proof paragraphs from the CV, close with availability and referees on request. No invented facts. Return only the letter text.`,
        JSON.stringify({ cv: compactCv(data.cv), job }),
        900,
      );
      if (!result.ok) return result;
      return { ok: true as const, kind: "letter" as const, text: result.text.slice(0, 4000) };
    }

    if (data.task === "interview") {
      const job = data.job?.trim().slice(0, 2400) ?? "";
      const history = (data.history ?? []).slice(-8).map((h) => ({
        question: h.question.slice(0, 500),
        answer: h.answer.slice(0, 1600),
        score: h.score,
        feedback: h.feedback?.slice(0, 800),
      }));

      if (data.mode === "start") {
        const result = await chat(
          `${UG_SYSTEM} You are a rigorous but encouraging interview coach. Start a realistic job interview using the candidate CV${job ? " and target job advert" : ""}. Return JSON only: {"question":"","questionType":"general|behavioral|technical|situational","feedback":"","strengths":[],"improvements":[],"followUp":"","tip":"","score":null,"overallScore":null,"phase":"question"}. Ask exactly one question. Make it appropriate to the target role and candidate level. Do not evaluate yet.`,
          JSON.stringify({ cv: compactCv(data.cv), job: job || undefined }),
          700,
        );
        if (!result.ok) return result;
        try {
          const parsed = extractJson(result.text) as Partial<InterviewResult>;
          return {
            ok: true as const,
            kind: "interview" as const,
            interview: {
              phase: "question" as const,
              question: String(parsed.question ?? "Tell me about yourself and why you are a good fit for this role.").slice(0, 700),
              questionType: (["general", "behavioral", "technical", "situational"] as const).includes(parsed.questionType as never)
                ? (parsed.questionType as InterviewResult["questionType"])
                : "general",
              score: null,
              feedback: "", strengths: [], improvements: [], followUp: "", tip: String(parsed.tip ?? "Use a clear structure and answer with evidence from your experience.").slice(0, 500), overallScore: null,
            },
          };
        } catch {
          return { ok: false as const, error: "Could not start the interview" };
        }
      }

      const question = data.question?.trim().slice(0, 700) ?? "";
      const answer = data.answer?.trim().slice(0, 2200) ?? "";
      if (!question || !answer) return { ok: false as const, error: "Answer the interview question first" };
      const result = await chat(
        `${UG_SYSTEM} You are an expert interviewer and coach. Evaluate the candidate's answer against the question, CV, and job advert. Be honest, specific, and useful. Return JSON only: {"phase":"question|complete","question":"next question or empty","questionType":"general|behavioral|technical|situational","score":0-100,"overallScore":0-100,"feedback":"2-4 sentences","strengths":["..."],"improvements":["..."],"followUp":"one coaching follow-up question or empty","tip":"one practical tip"}. The candidate must not be penalised for not claiming facts that are absent from the CV. Never invent experience. Vary question types. After 8 prior answered questions, set phase=complete and question empty.`,
        JSON.stringify({ cv: compactCv(data.cv), job: job || undefined, question, answer, history }),
        1200,
      );
      if (!result.ok) return result;
      try {
        const parsed = extractJson(result.text) as Partial<InterviewResult>;
        return {
          ok: true as const,
          kind: "interview" as const,
          interview: {
            phase: parsed.phase === "complete" ? "complete" as const : "question" as const,
            question: String(parsed.question ?? "").slice(0, 700),
            questionType: (["general", "behavioral", "technical", "situational"] as const).includes(parsed.questionType as never)
              ? (parsed.questionType as InterviewResult["questionType"])
              : "general",
            score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
            overallScore: parsed.overallScore == null ? null : Math.max(0, Math.min(100, Number(parsed.overallScore) || 0)),
            feedback: String(parsed.feedback ?? "").slice(0, 1000),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map((x) => String(x)).slice(0, 4) : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map((x) => String(x)).slice(0, 4) : [],
            followUp: String(parsed.followUp ?? "").slice(0, 500),
            tip: String(parsed.tip ?? "").slice(0, 500),
          },
        };
      } catch {
        return { ok: false as const, error: "Could not evaluate that answer" };
      }
    }

    if (data.task === "scan") {
      const image = data.image.trim();
      if (!image.startsWith("data:image/")) {
        return { ok: false as const, error: "Upload a photo of the ID" };
      }
      if (image.length > 400_000) {
        return { ok: false as const, error: "That scan is too large — try a closer crop." };
      }
      const result = await chat(
        'You read Ugandan National IDs (NIRA), East African passports, and similar identity documents. Return JSON only: {"fullName":"","dateOfBirth":"","nin":"","nationality":"","gender":"","cardNumber":""}. Use empty strings when a field is unreadable. Never guess a NIN. If this is not an identity document, return empty strings and put a short reason in fullName prefixed with "Not an ID: ".',
        "Extract the identity fields from this image.",
        400,
        image,
      );
      if (!result.ok) return result;
      try {
        const parsed = extractJson(result.text) as ScanResult;
        return {
          ok: true as const,
          kind: "scan" as const,
          scan: {
            fullName: String(parsed.fullName ?? "").slice(0, 80),
            dateOfBirth: String(parsed.dateOfBirth ?? "").slice(0, 40),
            nin: String(parsed.nin ?? "").slice(0, 24),
            nationality: String(parsed.nationality ?? "").slice(0, 40),
            gender: String(parsed.gender ?? "").slice(0, 24),
            cardNumber: String(parsed.cardNumber ?? "").slice(0, 32),
          },
        };
      } catch {
        return { ok: false as const, error: "Could not read that ID. Try a clearer photo." };
      }
    }

    const notes = data.notes.trim().slice(0, 4000);
    if (notes.length < 40) {
      return { ok: false as const, error: "Add more of your work history — at least a few sentences." };
    }
    const cat = CATEGORIES.find((c) => c.id === data.category);
    const result = await chat(
      `${UG_SYSTEM} Build a structured CV from the applicant's notes. Return JSON only: {"title":"","summary":"","experience":[{"company":"","role":"","location":"","start":"","end":"","current":false,"bullets":[""]}],"education":[{"school":"","degree":"","field":"","start":"","end":"","details":""}],"skills":[{"category":"","items":""}],"extras":[{"label":"","value":""}]}. 2–4 roles, 2–4 bullets each. Do not invent employers or numbers. If a year is missing, leave it blank. Location default Kampala, Uganda when implied.`,
      JSON.stringify({
        notes,
        category: cat?.label ?? data.category,
        targetTitle: data.title ?? "",
        fullName: data.fullName ?? "",
      }),
      1600,
    );
    if (!result.ok) return result;
    try {
      const parsed = extractJson(result.text) as ComposeResult;
      return {
        ok: true as const,
        kind: "compose" as const,
        compose: {
          title: String(parsed.title ?? data.title ?? "").slice(0, 80),
          summary: String(parsed.summary ?? "").slice(0, 800),
          experience: Array.isArray(parsed.experience)
            ? parsed.experience.slice(0, 6).map((e) => ({
                company: String(e.company ?? "").slice(0, 80),
                role: String(e.role ?? "").slice(0, 80),
                location: String(e.location ?? "").slice(0, 80),
                start: String(e.start ?? "").slice(0, 20),
                end: String(e.end ?? "").slice(0, 20),
                current: Boolean(e.current),
                bullets: Array.isArray(e.bullets) ? e.bullets.map((b) => String(b).slice(0, 280)).slice(0, 5) : [],
              }))
            : [],
          education: Array.isArray(parsed.education)
            ? parsed.education.slice(0, 4).map((e) => ({
                school: String(e.school ?? "").slice(0, 80),
                degree: String(e.degree ?? "").slice(0, 40),
                field: String(e.field ?? "").slice(0, 80),
                start: String(e.start ?? "").slice(0, 20),
                end: String(e.end ?? "").slice(0, 20),
                details: String(e.details ?? "").slice(0, 120),
              }))
            : [],
          skills: Array.isArray(parsed.skills)
            ? parsed.skills.slice(0, 5).map((s) => ({
                category: String(s.category ?? "").slice(0, 40),
                items: String(s.items ?? "").slice(0, 240),
              }))
            : [],
          extras: Array.isArray(parsed.extras)
            ? parsed.extras.slice(0, 6).map((x) => ({
                label: String(x.label ?? "").slice(0, 40),
                value: String(x.value ?? "").slice(0, 160),
              }))
            : [],
        },
      };
    } catch {
      return { ok: false as const, error: "Could not compile that draft. Try shorter notes." };
    }
  });
