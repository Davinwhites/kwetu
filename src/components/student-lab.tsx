import { useState } from "react";
import { runStudentAi, type StudentResult } from "@/lib/student-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const modes = [
  ["research", "Research answer"],
  ["explain", "Explain a concept"],
  ["coursework", "Review coursework"],
  ["code", "Study coding"],
] as const;

export function StudentLab() {
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState("Undergraduate");
  const [institution, setInstitution] = useState("");
  const [mode, setMode] = useState<(typeof modes)[number][0]>("research");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError(""); setResult(null);
    const response = await runStudentAi({ data: { question, course, level, institution, mode } });
    if (response.ok) setResult(response.student);
    else setError(response.error);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Kwetu student lab</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">Study smarter, not lazier.</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">Get explanations, research leads, coursework feedback, and focused coding help matched to your course. It will not build complete websites or apps for you.</p>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-display text-2xl font-medium">Your course profile</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Course or subject<Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Data structures" className="mt-2" /></label>
            <label className="block text-sm font-medium">Study level<select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Certificate</option><option>Diploma</option><option>Undergraduate</option><option>Postgraduate</option></select></label>
            <label className="block text-sm font-medium">University (optional)<Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Makerere University" className="mt-2" /></label>
          </div>
          <div className="mt-6"><p className="text-sm font-medium">What do you need?</p><div className="mt-2 grid grid-cols-2 gap-2">{modes.map(([id, label]) => <button key={id} type="button" onClick={() => setMode(id)} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${mode === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted hover:bg-surface"}`}>{label}</button>)}</div></div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <label className="text-sm font-medium">Your question or draft</label>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-2 min-h-56 resize-y" placeholder="Ask a specific question, paste a paragraph for feedback, or share a small code snippet..." />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-subtle">Tip: include the exact topic, requirements, and what you have tried.</p><Button onClick={submit} disabled={busy || !course || question.trim().length < 8}>{busy ? "Researching..." : "Get study help"}</Button></div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {result ? <article className="mt-8 border-t border-border pt-6"><div className="whitespace-pre-wrap text-sm leading-7">{result.answer}</div><p className="mt-6 rounded-lg bg-surface p-3 text-xs text-muted">{result.notice}</p>{result.sources.length ? <div className="mt-6"><h3 className="font-medium">Research leads</h3><ul className="mt-2 space-y-2">{result.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{source.title}</a><p className="text-xs text-subtle">{source.snippet}</p></li>)}</ul></div> : null}</article> : null}
        </section>
      </div>
    </main>
  );
}
