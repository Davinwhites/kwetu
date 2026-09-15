import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MessageSquare, RotateCcw, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { runCvAi, type InterviewResult, type ReviewResult, type TailorResult } from "@/lib/ai";
import type { CV } from "@/lib/cv/types";
import { TEMPLATE_META } from "@/lib/cv/types";
import { scoreCv } from "@/lib/cv/score";
import { useCvStore } from "@/lib/cv/store";
import { cn } from "@/lib/utils";

function ScoreRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function CoachPanel({ cv }: { cv: CV }) {
  const navigate = useNavigate();
  const score = useMemo(() => scoreCv(cv), [cv]);
  const update = useCvStore((s) => s.update);
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState<"review" | "tailor" | "interview" | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [tailor, setTailor] = useState<TailorResult | null>(null);
  const [interview, setInterview] = useState<InterviewResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [interviewHistory, setInterviewHistory] = useState<Array<{ question: string; answer: string; score?: number; feedback?: string }>>([]);
  const meta = TEMPLATE_META[cv.template];

  function onFail(res: { error: string; code?: string }) {
    if (res.code === "upgrade") {
      toast.error(res.error);
      void navigate({ to: "/pricing" });
      return;
    }
    toast.error(res.error);
  }

  async function reviewCv() {
    setBusy("review");
    try {
      const res = await runCvAi({ data: { task: "review", cv, job: job.trim() || undefined } });
      if (!res.ok) {
        onFail(res);
        return;
      }
      if (res.kind !== "review") {
        toast.error("Unexpected response");
        return;
      }
      setReview(res.review);
    } catch {
      toast.error("Review failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function startInterview() {
    setBusy("interview");
    setAnswer("");
    setInterviewHistory([]);
    try {
      const res = await runCvAi({
        data: { task: "interview", mode: "start", cv, job: job.trim() || undefined, history: [] },
      });
      if (!res.ok) {
        onFail(res);
        return;
      }
      if (res.kind !== "interview") {
        toast.error("Unexpected response");
        return;
      }
      setInterview(res.interview);
    } catch {
      toast.error("Could not start the interview. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function submitInterviewAnswer() {
    if (!interview?.question || !answer.trim()) {
      toast.error("Write your answer before submitting.");
      return;
    }
    setBusy("interview");
    const currentAnswer = answer.trim();
    try {
      const res = await runCvAi({
        data: {
          task: "interview",
          mode: "answer",
          cv,
          job: job.trim() || undefined,
          question: interview.question,
          answer: currentAnswer,
          history: interviewHistory,
        },
      });
      if (!res.ok) {
        onFail(res);
        return;
      }
      if (res.kind !== "interview") {
        toast.error("Unexpected response");
        return;
      }
      const nextHistory = [
        ...interviewHistory,
        { question: interview.question, answer: currentAnswer, score: res.interview.score ?? undefined, feedback: res.interview.feedback },
      ];
      setInterviewHistory(nextHistory);
      setInterview(res.interview);
      setAnswer("");
    } catch {
      toast.error("Answer evaluation failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function resetInterview() {
    setInterview(null);
    setAnswer("");
    setInterviewHistory([]);
  }

  async function tailorCv() {
    if (!job.trim()) {
      toast.error("Paste a job description to tailor against.");
      return;
    }
    setBusy("tailor");
    try {
      const res = await runCvAi({ data: { task: "tailor", cv, job: job.trim() } });
      if (!res.ok) {
        onFail(res);
        return;
      }
      if (res.kind !== "tailor") {
        toast.error("Unexpected response");
        return;
      }
      setTailor(res.tailor);
    } catch {
      toast.error("Tailor failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function applySummary(text: string) {
    update(cv.id, (cur) => ({ ...cur, summary: text }));
    toast.success("Summary updated");
  }

  function applyBullet(id: string, index: number, suggested: string) {
    update(cv.id, (cur) => ({
      ...cur,
      experience: cur.experience.map((e) =>
        e.id === id
          ? {
              ...e,
              bullets: e.bullets.map((b, i) => (i === index ? suggested : b)),
            }
          : e,
      ),
    }));
    toast.success("Bullet updated");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
        <ScoreRing value={score.total} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Writing score</p>
          <p className="text-sm text-muted">
            {score.bulletIssues
              ? `${score.bulletIssues} bullet ${score.bulletIssues === 1 ? "note" : "notes"} to tighten`
              : "Bullets look disciplined"}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {meta.label} · {meta.ats ? "ATS-safer single column" : "Visual two-column — export Official or Editorial for ATS"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {score.parts.map((part) => (
          <div key={part.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{part.label}</span>
              <span className="tabular-nums text-muted">
                {part.score}/{part.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-fast)]"
                style={{ width: `${(part.score / part.max) * 100}%` }}
              />
            </div>
            {part.hints[0] ? <p className="mt-1 text-xs text-muted">{part.hints[0]}</p> : null}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Target a role</p>
        <Textarea
          value={job}
          onChange={(e) => setJob(e.target.value)}
          placeholder="Paste a job description from BrighterMonday, a ministry circular, or an NGO advert. We retarget wording — we do not invent experience."
          className="min-h-[120px]"
        />
        <div className="flex flex-col gap-2">
          <Button onClick={() => void reviewCv()} disabled={busy !== null} className="w-full">
            {busy === "review" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Review with AI
          </Button>
          <Button variant="secondary" onClick={() => void tailorCv()} disabled={busy !== null} className="w-full">
            {busy === "tailor" ? <Loader2 className="animate-spin" /> : <Target />}
            Tailor wording
          </Button>
          <Button variant="outline" onClick={() => void (interview ? submitInterviewAnswer() : startInterview())} disabled={busy !== null} className="w-full">
            {busy === "interview" ? <Loader2 className="animate-spin" /> : <MessageSquare />}
            {interview ? "Submit answer" : "Start mock interview"}
          </Button>
        </div>
      </div>

      {interview ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Live interview coach</p>
              <p className="mt-1 text-xs text-subtle">Question {interviewHistory.length + 1} · {interview.questionType}</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={resetInterview} aria-label="Reset interview">
              <RotateCcw />
            </Button>
          </div>

          {interview.score != null && interviewHistory.length > 0 ? (
            <div className="rounded-xl bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Latest answer</span>
                <Badge variant={interview.score >= 75 ? "good" : interview.score >= 50 ? "warn" : "danger"}>{interview.score}/100</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{interview.feedback}</p>
              {interview.strengths.length ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">What worked</p>
                  {interview.strengths.map((x, i) => <p key={i} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{x}</p>)}
                </div>
              ) : null}
              {interview.improvements.length ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">Improve next</p>
                  {interview.improvements.map((x, i) => <p key={i} className="text-sm text-muted">• {x}</p>)}
                </div>
              ) : null}
              {interview.tip ? <p className="mt-3 text-xs text-subtle">Tip: {interview.tip}</p> : null}
            </div>
          ) : null}

          {interview.phase === "complete" ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-medium">Interview complete</p>
              <p className="mt-1 text-sm text-muted">You answered {interviewHistory.length} questions.</p>
              {interview.overallScore != null ? <p className="mt-3 text-2xl font-display font-medium">Overall score: {interview.overallScore}/100</p> : null}
              <Button className="mt-3" variant="secondary" onClick={startInterview}>Start again</Button>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">Interviewer</p>
                <p className="mt-2 text-base font-medium leading-relaxed">{interview.question}</p>
              </div>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer as you would say it in the interview. Aim for a clear example, action, and result."
                className="min-h-[150px]"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    void submitInterviewAnswer();
                  }
                }}
              />
              <p className="text-xs text-subtle">Ctrl/Cmd + Enter submits. The coach will score the answer and continue with the next question.</p>
              {interview.followUp ? <p className="text-sm text-muted">Coaching follow-up: {interview.followUp}</p> : null}
            </>
          )}
        </div>
      ) : null}

      {review ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">AI review</p>
            <Badge variant="good" className="tabular-nums">
              {review.score}
            </Badge>
          </div>
          <p className="text-sm text-muted">{review.summary}</p>
          <ul className="space-y-2">
            {review.issues.map((issue, i) => (
              <li key={i} className="rounded-xl bg-surface p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={issue.severity === "high" ? "danger" : issue.severity === "med" ? "warn" : "secondary"}
                  >
                    {issue.severity}
                  </Badge>
                  <p className="text-sm font-medium">{issue.title}</p>
                </div>
                <p className="text-sm text-muted">{issue.fix}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tailor ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Suggested retarget</p>
          {tailor.note ? <p className="text-sm text-muted">{tailor.note}</p> : null}
          {tailor.summary ? (
            <div className="rounded-xl bg-surface p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Summary</p>
              <p className="text-sm">{tailor.summary}</p>
              <Button size="sm" className="mt-3" onClick={() => applySummary(tailor.summary)}>
                Apply summary
              </Button>
            </div>
          ) : null}
          {tailor.bullets.map((b, i) => (
            <div key={`${b.id}-${b.index}-${i}`} className="rounded-xl bg-surface p-3">
              <p className="text-sm">{b.suggested}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => applyBullet(b.id, b.index, b.suggested)}
              >
                Apply bullet
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <p className={cn("text-xs text-subtle")}>
        AI runs only when you press a button. Drafts are saved to your KwetuCV account.
      </p>
    </div>
  );
}
