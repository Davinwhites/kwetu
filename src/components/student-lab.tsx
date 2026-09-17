import { useState, type ChangeEvent } from "react";
import { Check, Copy, Download, ImagePlus, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { forgetStudentMemory, listStudentMemories, runStudentAi, type StudentResult } from "@/lib/student-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const modes = [
  ["research", "Research answer"],
  ["explain", "Explain a concept"],
  ["coursework", "Review coursework"],
  ["code", "Study coding"],
  ["image", "Create an image"],
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
  const [downloadFormat, setDownloadFormat] = useState("txt");
  const [copied, setCopied] = useState(false);
  const [image, setImage] = useState<{ name: string; mimeType: string; data: string; preview: string } | null>(null);
  const [memories, setMemories] = useState<{ id: string; memory: string }[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  function outputText() {
    if (!result) return "";
    const sources = result.sources.length
      ? `\n\nSources:\n${result.sources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}`
      : "\n\nSources: No live sources were available.";
    return `${result.answer}\n\n${result.notice ?? ""}${sources}`.trim();
  }

  async function copyAnswer() {
    await navigator.clipboard.writeText(outputText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadAnswer() {
    const text = outputText();
    const title = `${course.trim() || "study-answer"}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "study-answer";
    const formats: Record<string, { extension: string; type: string; content: string }> = {
      txt: { extension: "txt", type: "text/plain;charset=utf-8", content: text },
      md: { extension: "md", type: "text/markdown;charset=utf-8", content: `# ${course}\n\n${text}` },
      html: { extension: "html", type: "text/html;charset=utf-8", content: `<!doctype html><meta charset="utf-8"><title>${course}</title><pre style="white-space:pre-wrap;font:16px system-ui">${text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char)}</pre>` },
      doc: { extension: "doc", type: "application/msword", content: `<html><body><h1>${course}</h1><pre>${text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char)}</pre></body></html>` },
    };
    if (downloadFormat === "pdf") {
      const pdf = new jsPDF();
      const lines = pdf.splitTextToSize(text, 175);
      pdf.setFontSize(16);
      pdf.text(course || "Study answer", 18, 20);
      pdf.setFontSize(10);
      pdf.text(lines, 18, 32);
      pdf.save(`${title}.pdf`);
      return;
    }
    const format = formats[downloadFormat] ?? formats.txt;
    const url = URL.createObjectURL(new Blob([format.content], { type: format.type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.${format.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
      setError("Choose an image smaller than 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImage({ name: file.name, mimeType: file.type, data: dataUrl.split(",")[1] ?? "", preview: dataUrl });
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function toggleMemories() {
    if (!showMemories) {
      const saved = await listStudentMemories();
      setMemories(saved);
    }
    setShowMemories((visible) => !visible);
  }

  async function removeMemory(id: string) {
    await forgetStudentMemory({ data: { id } });
    setMemories((items) => items.filter((item) => item.id !== id));
  }

  async function submit() {
    const trimmedCourse = course.trim();
    const trimmedQuestion = question.trim();
    if (!trimmedCourse) {
      setError("Choose a course or subject first.");
      return;
    }
    if (trimmedQuestion.length < 8 && !image) {
      setError("Ask a question or upload an image to review first.");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    setGeneratedImageUrl(null);
    try {
      const response = await runStudentAi({
        data: { question: trimmedQuestion, course: trimmedCourse, level, institution: institution.trim(), mode, image: image ? { name: image.name, mimeType: image.mimeType, data: image.data } : undefined },
      });
      if (response.ok) {
        setResult(response.student);
        if (response.student.generatedImage) setGeneratedImageUrl(`data:${response.student.generatedImage.mimeType};base64,${response.student.generatedImage.data}`);
      }
      else setError(response.error);
    } catch {
      setError("The study assistant could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
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
          <div className="mt-6"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">What do you need?</p><button type="button" onClick={() => void toggleMemories()} className="text-xs font-medium text-primary underline underline-offset-4">{showMemories ? "Hide memory" : "View memory"}</button></div><div className="mt-2 grid grid-cols-2 gap-2">{modes.map(([id, label]) => <button key={id} type="button" onClick={() => setMode(id)} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${mode === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted hover:bg-surface"}`}>{label}</button>)}</div>{showMemories ? <div className="mt-4 rounded-lg bg-surface p-3"><p className="text-xs text-muted">Tell the assistant &quot;remember...&quot; and it will use that instruction in future answers.</p>{memories.length ? <ul className="mt-3 space-y-2">{memories.map((item) => <li key={item.id} className="flex items-start justify-between gap-2 text-sm"><span>{item.memory}</span><button type="button" onClick={() => void removeMemory(item.id)} className="shrink-0 text-xs text-danger underline">Forget</button></li>)}</ul> : <p className="mt-3 text-xs text-subtle">No saved instructions yet.</p>}</div> : null}</div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <label className="text-sm font-medium">Your question or draft</label>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-2 min-h-56 resize-y" placeholder="Ask a specific question, paste a paragraph for feedback, or share a small code snippet..." />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface"><ImagePlus data-icon="inline-start" />Review an image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleImage} /></label>
            {image ? <div className="flex items-center gap-2 rounded-md bg-surface px-2 py-1 text-xs"><img src={image.preview} alt="Selected study material" className="size-10 rounded object-cover" /><span className="max-w-40 truncate">{image.name}</span><button type="button" aria-label="Remove image" onClick={() => setImage(null)}><X /></button></div> : <span className="text-xs text-subtle">PNG, JPG, or WebP up to 6 MB</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-subtle">Tip: include the exact topic, requirements, and what you have tried.</p><Button onClick={submit} disabled={busy || !course || (question.trim().length < 8 && !image)}>{busy ? "Researching..." : "Get study help"}</Button></div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {result ? <article className="mt-8 border-t border-border pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-medium">Study answer</h2><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={copyAnswer}>{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? "Copied" : "Copy"}</Button><select aria-label="Download format" value={downloadFormat} onChange={(event) => setDownloadFormat(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="txt">Text (.txt)</option><option value="md">Markdown (.md)</option><option value="html">Web page (.html)</option><option value="doc">Word document (.doc)</option><option value="pdf">PDF (.pdf)</option></select><Button type="button" size="sm" onClick={downloadAnswer}><Download data-icon="inline-start" />Download</Button></div></div><div className="kwetu-answer mt-5 whitespace-pre-wrap text-sm leading-7">{result.answer}</div>{generatedImageUrl ? <div className="mt-5 rounded-xl border border-border bg-surface p-3"><img src={generatedImageUrl} alt="AI-generated image" className="max-h-[32rem] w-full rounded-lg object-contain" /><a href={generatedImageUrl} download={`${course || "kwetu-generated-image"}.png`} className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-background">Download image</a></div> : null}<p className="mt-6 rounded-lg bg-surface p-3 text-xs text-muted">{result.notice}</p>{result.sources.length ? <div className="mt-6"><h3 className="font-medium">Sources</h3><ul className="mt-2 space-y-2">{result.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{source.title}</a><p className="text-xs text-subtle">{source.snippet}</p></li>)}</ul></div> : <p className="mt-6 text-xs text-subtle">No live sources were available for this answer. Verify important claims using your library or lecturer.</p>}</article> : null}
        </section>
      </div>
    </main>
  );
}
