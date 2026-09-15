import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCvStore } from "@/lib/cv/store";
import { scoreCv } from "@/lib/cv/score";
import { CATEGORIES, categoryById } from "@/lib/cv/categories";
import { TEMPLATE_META, type CV } from "@/lib/cv/types";
import { blankCv } from "@/lib/cv/normalize";
import { uid, formatEdited } from "@/lib/utils";
import { runCvAi } from "@/lib/ai";
import { deleteDocument, saveDocument } from "@/lib/data/documents";
import { fetchEntitlements } from "@/lib/data/billing";
import type { Entitlements } from "@/lib/billing/plans";
import { PLANS, formatUgx } from "@/lib/billing/plans";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useCvStore((s) => s.hydrated);
  const order = useCvStore((s) => s.order);
  const cvMap = useCvStore((s) => s.cvs);
  const cvs = order.map((id) => cvMap[id]).filter((c): c is CV => Boolean(c));
  const create = useCvStore((s) => s.create);
  const importCv = useCvStore((s) => s.importCv);
  const remove = useCvStore((s) => s.remove);
  const navigate = useNavigate();
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetchEntitlements()
      .then(setEnts)
      .catch(() => setEnts(null));
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader compact />
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  async function openNew() {
    const cv = create("blank");
    try {
      await saveDocument({ data: cv });
    } catch {
      /* local copy still opens */
    }
    void navigate({ to: "/editor/$cvId", params: { cvId: cv.id } });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader compact />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Your studio</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
              {user.displayName ? `Hello, ${user.displayName.split(" ")[0]}` : "Your CVs"}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Saved on your account — not only this browser.{" "}
              {ents
                ? ents.plan === "free"
                  ? `Starter · ${cvs.length}/${ents.maxCvs} drafts`
                  : `${PLANS[ents.plan].name} · ${formatUgx(PLANS[ents.plan].priceUgx)}`
                : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to="/account">Account</Link>
            </Button>
            <Button variant="outline" onClick={() => setFinishOpen(true)}>
              <Sparkles />
              Finish with AI
            </Button>
            <Button onClick={() => void openNew()}>
              <Plus />
              New CV
            </Button>
          </div>
        </div>

        <div className="mt-10">
          {!hydrated ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          ) : cvs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <p className="font-display text-xl">No drafts yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Start blank, or finish a complete CV from notes with AI.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cvs.map((cv) => (
                <li
                  key={cv.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-border)]"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void navigate({ to: "/editor/$cvId", params: { cvId: cv.id } })}
                  >
                    <p className="truncate font-display text-xl font-medium tracking-tight">
                      {cv.personal.fullName || cv.name || "Untitled"}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {cv.personal.title || categoryById(cv.category).label}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-subtle">
                      <span className="tabular-nums text-primary">{scoreCv(cv).total}</span>
                      <span>·</span>
                      <span>{TEMPLATE_META[cv.template].label}</span>
                      <span>·</span>
                      <span>{formatEdited(cv.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        remove(cv.id);
                        void deleteDocument({ data: cv.id });
                        toast.success("Deleted");
                      }}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <FinishDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        onCreated={(cv) => {
          const stored = importCv(cv);
          void saveDocument({ data: stored });
          void navigate({ to: "/editor/$cvId", params: { cvId: stored.id } });
        }}
      />
      <SiteFooter />
    </div>
  );
}

function FinishDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (cv: CV) => void;
}) {
  const navigate = useNavigate();
  const [category, setCategory] = useState("ngo");
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await runCvAi({
        data: {
          task: "compose",
          notes,
          category,
          title: title.trim() || undefined,
          fullName: fullName.trim() || undefined,
        },
      });
      if (!res.ok) {
        if ("code" in res && res.code === "upgrade") {
          toast.error(res.error);
          onOpenChange(false);
          void navigate({ to: "/checkout", search: { plan: "finish" } });
          return;
        }
        toast.error(res.error);
        return;
      }
      if (res.kind !== "compose") return;
      const c = res.compose;
      const cat = categoryById(category);
      const cv = blankCv({
        id: uid(),
        name: `${fullName || c.title || "Finished CV"}`,
        template: cat.template,
        category,
        personal: {
          fullName: fullName || "",
          title: c.title || title,
          email: "",
          phone: "",
          location: "Kampala, Uganda",
          website: "",
          linkedin: "",
          github: "",
          nationality: "Ugandan",
          dateOfBirth: "",
          nin: "",
          gender: "",
          photoDataUrl: "",
        },
        summary: c.summary,
        experience: c.experience.map((e) => ({ ...e, id: uid() })),
        education: c.education.map((e) => ({ ...e, id: uid() })),
        skills: c.skills.map((s) => ({ ...s, id: uid() })),
        extras: c.extras.map((x) => ({ ...x, id: uid() })),
      });
      onCreated(cv);
      onOpenChange(false);
      toast.success("Draft compiled — review every fact before you send it.");
    } catch {
      toast.error("Could not finish that CV");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Finish a complete CV with AI</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 px-1 pb-2">
          <p className="text-sm text-muted">
            Paste your history in your own words. The compiler will not invent employers or numbers. Career Pro or a
            one-time Finish credit required ({formatUgx(PLANS.finish.priceUgx)}).
          </p>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Your name</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Target title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Credit Officer" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Notes</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[160px]"
              placeholder="Roles, years, schools, skills, numbers you actually have…"
            />
          </label>
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Compile with AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
