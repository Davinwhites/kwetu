import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Eye,
  MoreHorizontal,
  PenLine,
  Printer,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { CoachPanel } from "@/components/cv/coach";
import { EditorForm } from "@/components/cv/form";
import { CvDocument, CvStage } from "@/components/cv/preview";
import { Wordmark } from "@/components/cv/wordmark";
import { useCvAutosave } from "@/components/cv/hydrate";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CV, SectionId, TemplateId } from "@/lib/cv/types";
import { SECTIONS, TEMPLATE_META, TEMPLATES } from "@/lib/cv/types";
import { scoreCv } from "@/lib/cv/score";
import { useCvStore } from "@/lib/cv/store";
import { deleteDocument } from "@/lib/data/documents";
import { cn } from "@/lib/utils";
import { AuthSlot } from "@/components/site/chrome";

export function EditorWorkspace({ cv }: { cv: CV }) {
  const navigate = useNavigate();
  const setTemplate = useCvStore((s) => s.setTemplate);
  const remove = useCvStore((s) => s.remove);
  const [section, setSection] = useState<SectionId>("profile");
  const [pane, setPane] = useState<"write" | "preview">("write");
  const [coachOpen, setCoachOpen] = useState(false);
  const score = useMemo(() => scoreCv(cv), [cv]);
  useCvAutosave(cv.id);

  function downloadPdf() {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 18;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text: string, size = 10, bold = false, gap = 5) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text.trim(), contentWidth);
      for (const line of lines) {
        if (y > 278) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += size * 0.45 + 1.5;
      }
      y += gap;
    };

    const addSection = (title: string) => {
      if (y > 268) {
        pdf.addPage();
        y = 20;
      }
      pdf.setDrawColor(210, 210, 210);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
      addText(title.toUpperCase(), 10, true, 3);
    };

    const personal = cv.personal;
    addText(personal.fullName || cv.name || "Curriculum Vitae", 20, true, 1);
    if (personal.title.trim()) addText(personal.title, 11, false, 2);
    const contacts = [personal.email, personal.phone, personal.location, personal.website].filter((value) => value.trim());
    if (contacts.length) addText(contacts.join("  ·  "), 9, false, 7);

    if (cv.summary.trim()) {
      addSection("Career objective");
      addText(cv.summary, 10, false, 4);
    }

    const experiences = cv.experience.filter((item) => item.company.trim() || item.role.trim());
    if (experiences.length) {
      addSection("Experience");
      experiences.forEach((item) => {
        addText(`${item.role || "Role"}${item.company ? ` · ${item.company}` : ""}`, 10, true, 1);
        const dates = [item.start, item.current ? "Present" : item.end].filter(Boolean).join(" – ");
        if (dates || item.location.trim()) addText([item.location, dates].filter(Boolean).join("  ·  "), 9, false, 1);
        item.bullets.filter((bullet) => bullet.trim()).forEach((bullet) => addText(`• ${bullet}`, 9, false, 1));
        y += 3;
      });
    }

    const education = cv.education.filter((item) => item.school.trim());
    if (education.length) {
      addSection("Education");
      education.forEach((item) => {
        addText(`${item.school}${item.degree || item.field ? ` · ${[item.degree, item.field].filter(Boolean).join(" ")}` : ""}`, 10, true, 1);
        if (item.details.trim()) addText(item.details, 9, false, 1);
        y += 3;
      });
    }

    const projects = cv.projects.filter((item) => item.name.trim());
    if (projects.length) {
      addSection("Projects");
      projects.forEach((item) => {
        addText(`${item.name}${item.url ? ` · ${item.url}` : ""}`, 10, true, 1);
        if (item.summary.trim()) addText(item.summary, 9, false, 1);
        item.bullets.filter((bullet) => bullet.trim()).forEach((bullet) => addText(`• ${bullet}`, 9, false, 1));
        y += 3;
      });
    }

    const skills = cv.skills.filter((item) => item.items.trim());
    if (skills.length) {
      addSection("Skills");
      skills.forEach((item) => addText(`${item.category ? `${item.category} · ` : ""}${item.items}`, 9, false, 1));
      y += 3;
    }

    const extras = cv.extras.filter((item) => item.value.trim());
    if (extras.length) {
      addSection("Additional");
      extras.forEach((item) => addText(`${item.label ? `${item.label} · ` : ""}${item.value}`, 9, false, 1));
    }

    if (cv.coverLetter.trim()) {
      addSection("Cover letter");
      addText(cv.coverLetter, 10, false, 2);
    }

    const filename = `${(personal.fullName || cv.name || "cv").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "cv"}.pdf`;
    pdf.save(filename);
    toast.success("PDF downloaded");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cv.personal.fullName || cv.name || "cv").replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-5">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/studio" aria-label="Back to studio">
              <ArrowLeft />
            </Link>
          </Button>
          <Wordmark className="hidden sm:inline-flex" to="/studio" />
          <span className="hidden text-border sm:inline">/</span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{cv.name || "Untitled CV"}</p>
          <Badge variant="good" className="tabular-nums">
            {score.total}
          </Badge>
          <Button size="sm" variant="ghost" className="hidden lg:inline-flex" onClick={() => setCoachOpen(true)}>
            <Sparkles />
            Coach
          </Button>
          <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={downloadPdf}>
            <Printer />
            Compile PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="More">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="sm:hidden" onSelect={downloadPdf}>
                <Download className="size-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportJson}>
                <Download className="size-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCoachOpen(true)}>
                <Sparkles className="size-4" />
                Writing coach
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  remove(cv.id);
                  void deleteDocument({ data: cv.id });
                  toast.success("Draft deleted");
                  void navigate({ to: "/studio" });
                }}
              >
                <Trash2 className="size-4" />
                Delete draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden md:block">
            <AuthSlot />
          </div>
        </div>
        <div className="no-print flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
          <Button
            size="sm"
            variant={pane === "write" ? "default" : "ghost"}
            onClick={() => setPane("write")}
            className="shrink-0"
          >
            <PenLine />
            Write
          </Button>
          <Button
            size="sm"
            variant={pane === "preview" ? "default" : "ghost"}
            onClick={() => setPane("preview")}
            className="shrink-0"
          >
            <Eye />
            Preview
          </Button>
        </div>
      </header>

      <div className="no-print mx-auto grid max-w-[1600px] lg:grid-cols-[minmax(0,1fr)_minmax(340px,520px)] xl:grid-cols-[200px_minmax(0,1fr)_minmax(380px,560px)]">
        <nav className="hidden border-r border-border xl:block">
          <div className="sticky top-[57px] space-y-1 p-4">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-[var(--motion-quick)]",
                  section === s.id ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
            <p className="px-3 pt-6 text-xs font-medium uppercase tracking-wide text-subtle">Template</p>
            <TemplatePicker value={cv.template} onChange={(t) => setTemplate(cv.id, t)} />
          </div>
        </nav>

        <section className={cn("min-w-0 border-r border-border", pane === "preview" ? "hidden lg:block" : "block")}>
          <div className="xl:hidden">
            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "h-11 shrink-0 rounded-full px-4 text-sm font-medium",
                    section === s.id ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="px-3 pb-2">
              <TemplatePicker value={cv.template} onChange={(t) => setTemplate(cv.id, t)} />
            </div>
          </div>
          <div className="px-3 pb-24 pt-2 sm:px-6 sm:pt-5">
            <EditorForm cv={cv} section={section} />
          </div>
        </section>

        <aside className={cn("min-w-0 bg-surface/60", pane === "write" ? "hidden lg:block" : "block")}>
          <div className="sticky top-[57px] max-h-[calc(100dvh-57px)] overflow-auto p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Compiled page</p>
              <Button size="sm" variant="outline" className="lg:hidden" onClick={downloadPdf}>
                <Download />
                Download PDF
              </Button>
            </div>
            <CvStage cv={cv} />
            {cv.coverLetter.trim() ? (
              <article className="mt-6 rounded-xl bg-paper p-5 text-sm leading-relaxed shadow-[var(--shadow-border)]">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Cover letter</p>
                <pre className="whitespace-pre-wrap font-sans">{cv.coverLetter}</pre>
              </article>
            ) : null}
          </div>
        </aside>
      </div>

      <Sheet open={coachOpen} onOpenChange={setCoachOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Writing coach</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-10">
            <CoachPanel cv={cv} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden print-only">
        <CvDocument cv={cv} />
        {cv.coverLetter.trim() ? (
          <article className="cv-sheet" style={{ marginTop: 24 }}>
            <h2>Cover letter</h2>
            <p className="whitespace-pre-wrap">{cv.coverLetter}</p>
          </article>
        ) : null}
      </div>
    </div>
  );
}

function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto xl:flex-col">
      {TEMPLATES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "h-11 shrink-0 rounded-lg px-3 text-left text-sm transition-colors duration-[var(--motion-quick)] xl:h-auto xl:py-2",
            value === id ? "bg-card text-foreground shadow-[var(--shadow-border)]" : "text-muted hover:text-foreground",
          )}
        >
          <span className="block font-medium">{TEMPLATE_META[id].label}</span>
          <span className="hidden text-xs text-subtle xl:block">{TEMPLATE_META[id].blurb}</span>
        </button>
      ))}
    </div>
  );
}
