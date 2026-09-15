import type { ReactNode } from "react";
import { Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runCvAi } from "@/lib/ai";
import type {
  CV,
  EducationItem,
  ExperienceItem,
  ExtraItem,
  ProjectItem,
  Referee,
  SectionId,
  SkillGroup,
} from "@/lib/cv/types";
import { CATEGORIES } from "@/lib/cv/categories";
import { lintBullet } from "@/lib/cv/score";
import { useCvStore } from "@/lib/cv/store";
import { compressImageFile } from "@/lib/image";
import { cn, uid } from "@/lib/utils";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function useUpgrade() {
  const navigate = useNavigate();
  return (message?: string) => {
    toast.error(message || "This AI tool is on Writer and Career Pro.");
    void navigate({ to: "/pricing" });
  };
}

function ImproveButton({
  text,
  role,
  company,
  onApply,
}: {
  text: string;
  role?: string;
  company?: string;
  onApply: (next: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const upgrade = useUpgrade();
  async function run() {
    if (!text.trim()) {
      toast.error("Write a draft first.");
      return;
    }
    setBusy(true);
    try {
      const res = await runCvAi({
        data: { task: "rewrite", text, role, company },
      });
      if (!res.ok) {
        if ("code" in res && res.code === "upgrade") upgrade(res.error);
        else toast.error(res.error);
        return;
      }
      if (res.kind !== "rewrite") {
        toast.error("Unexpected response");
        return;
      }
      onApply(res.text);
      toast.success("Rewritten");
    } catch {
      toast.error("Rewrite failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => void run()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Improve
    </Button>
  );
}

export function EditorForm({ cv, section }: { cv: CV; section: SectionId }) {
  const update = useCvStore((s) => s.update);
  const set = (patch: (cur: CV) => CV) => update(cv.id, patch);

  if (section === "profile") {
    return <ProfileForm cv={cv} set={set} />;
  }

  if (section === "summary") {
    const count = cv.summary.trim() ? cv.summary.trim().split(/\s+/).length : 0;
    return (
      <Block
        title="Career objective"
        action={
          <ImproveButton
            text={cv.summary}
            role={cv.personal.title}
            onApply={(text) => set((cur) => ({ ...cur, summary: text }))}
          />
        }
      >
        <Textarea
          value={cv.summary}
          onChange={(e) => set((cur) => ({ ...cur, summary: e.target.value }))}
          className="min-h-[160px]"
          placeholder="Three sentences: who you are, the scale you operate at, the proof — written for a Ugandan hiring panel."
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span className="tabular-nums">{count} words · aim 40–90</span>
          {/\bI\b|\bmy\b/i.test(cv.summary) ? <span>Drop “I” and “my”.</span> : null}
        </div>
      </Block>
    );
  }

  if (section === "experience") {
    return (
      <div className="space-y-4">
        {cv.experience.map((item, idx) => (
          <ExperienceCard
            key={item.id}
            item={item}
            index={idx}
            onChange={(next) =>
              set((cur) => ({
                ...cur,
                experience: cur.experience.map((e) => (e.id === item.id ? next : e)),
              }))
            }
            onRemove={() =>
              set((cur) => ({
                ...cur,
                experience: cur.experience.filter((e) => e.id !== item.id),
              }))
            }
          />
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              experience: [
                ...cur.experience,
                {
                  id: uid(),
                  company: "",
                  role: "",
                  location: "",
                  start: "",
                  end: "",
                  current: false,
                  bullets: ["", ""],
                },
              ],
            }))
          }
        >
          <Plus />
          Add role
        </Button>
      </div>
    );
  }

  if (section === "education") {
    return (
      <div className="space-y-4">
        {cv.education.map((item) => (
          <Block
            key={item.id}
            title={item.school || "School"}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  set((cur) => ({
                    ...cur,
                    education: cur.education.filter((e) => e.id !== item.id),
                  }))
                }
                aria-label="Remove school"
              >
                <Trash2 />
              </Button>
            }
          >
            <EduFields
              item={item}
              onChange={(next) =>
                set((cur) => ({
                  ...cur,
                  education: cur.education.map((e) => (e.id === item.id ? next : e)),
                }))
              }
            />
          </Block>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              education: [
                ...cur.education,
                { id: uid(), school: "", degree: "", field: "", start: "", end: "", details: "" },
              ],
            }))
          }
        >
          <Plus />
          Add school
        </Button>
      </div>
    );
  }

  if (section === "skills") {
    return (
      <div className="space-y-4">
        {cv.skills.map((item) => (
          <Block
            key={item.id}
            title={item.category || "Group"}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove skill group"
                onClick={() =>
                  set((cur) => ({
                    ...cur,
                    skills: cur.skills.filter((s) => s.id !== item.id),
                  }))
                }
              >
                <Trash2 />
              </Button>
            }
          >
            <SkillFields
              item={item}
              onChange={(next) =>
                set((cur) => ({
                  ...cur,
                  skills: cur.skills.map((s) => (s.id === item.id ? next : s)),
                }))
              }
            />
          </Block>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              skills: [...cur.skills, { id: uid(), category: "", items: "" }],
            }))
          }
        >
          <Plus />
          Add skill group
        </Button>
      </div>
    );
  }

  if (section === "letter") {
    return <LetterForm cv={cv} set={set} />;
  }

  return <MoreForm cv={cv} set={set} />;
}

function ProfileForm({ cv, set }: { cv: CV; set: (patch: (cur: CV) => CV) => void }) {
  const p = cv.personal;
  const setP = (key: keyof typeof p, value: string) =>
    set((cur) => ({ ...cur, personal: { ...cur.personal, [key]: value } }));
  const photoRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const upgrade = useUpgrade();

  async function onPhoto(file: File) {
    try {
      const data = await compressImageFile(file, 480, 0.84);
      setP("photoDataUrl", data);
      toast.success("Photo added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that photo");
    }
  }

  async function onId(file: File) {
    setScanBusy(true);
    try {
      const data = await compressImageFile(file, 900, 0.78);
      if (!p.photoDataUrl) setP("photoDataUrl", data);
      const res = await runCvAi({ data: { task: "scan", image: data } });
      if (!res.ok) {
        if ("code" in res && res.code === "upgrade") upgrade(res.error);
        else toast.error(res.error);
        return;
      }
      if (res.kind !== "scan") return;
      const s = res.scan;
      if (s.fullName.startsWith("Not an ID")) {
        toast.error("That does not look like a National ID or passport.");
        return;
      }
      set((cur) => ({
        ...cur,
        personal: {
          ...cur.personal,
          fullName: s.fullName || cur.personal.fullName,
          dateOfBirth: s.dateOfBirth || cur.personal.dateOfBirth,
          nin: s.nin || cur.personal.nin,
          nationality: s.nationality || cur.personal.nationality,
          gender: s.gender || cur.personal.gender,
          photoDataUrl: cur.personal.photoDataUrl || data,
        },
      }));
      toast.success("Details copied from the ID. Check every field.");
    } catch {
      toast.error("Could not read that ID");
    } finally {
      setScanBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Block title="Portrait & identity">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            {p.photoDataUrl ? (
              <img
                src={p.photoDataUrl}
                alt="Passport photo"
                className="h-[132px] w-[108px] rounded-md object-cover shadow-[var(--shadow-border)]"
              />
            ) : (
              <div className="grid h-[132px] w-[108px] place-items-center rounded-md bg-surface text-center text-xs text-muted">
                Passport photo
              </div>
            )}
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPhoto(file);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => photoRef.current?.click()}>
              <Upload />
              Photo
            </Button>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-muted">
              Ugandan public-service and NGO applications usually want a passport-style photo. You can also import a
              photo of your National ID — we copy name, NIN, and date of birth for you to confirm.
            </p>
            <input
              ref={idRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onId(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => idRef.current?.click()} disabled={scanBusy}>
              {scanBusy ? <Loader2 className="animate-spin" /> : <Upload />}
              Import National ID
            </Button>
          </div>
        </div>
      </Block>

      <Block title="Profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input
              value={p.fullName}
              onChange={(e) => setP("fullName", e.target.value)}
              placeholder="Namukasa Rebecca"
            />
          </Field>
          <Field label="Target title" className="sm:col-span-2">
            <Input
              value={p.title}
              onChange={(e) => setP("title", e.target.value)}
              placeholder="Monitoring & Evaluation Officer"
            />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <select
              value={cv.category}
              onChange={(e) => set((cur) => ({ ...cur, category: e.target.value }))}
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-[var(--shadow-border)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <Input value={p.email} onChange={(e) => setP("email", e.target.value)} placeholder="you@email.com" />
          </Field>
          <Field label="Phone">
            <Input value={p.phone} onChange={(e) => setP("phone", e.target.value)} placeholder="+256 772 …" />
          </Field>
          <Field label="Location">
            <Input
              value={p.location}
              onChange={(e) => setP("location", e.target.value)}
              placeholder="Kampala, Uganda"
            />
          </Field>
          <Field label="Nationality">
            <Input
              value={p.nationality}
              onChange={(e) => setP("nationality", e.target.value)}
              placeholder="Ugandan"
            />
          </Field>
          <Field label="Date of birth">
            <Input
              value={p.dateOfBirth}
              onChange={(e) => setP("dateOfBirth", e.target.value)}
              placeholder="12 March 1994"
            />
          </Field>
          <Field label="Sex">
            <Input value={p.gender} onChange={(e) => setP("gender", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="National ID (NIN)" className="sm:col-span-2">
            <Input
              value={p.nin}
              onChange={(e) => setP("nin", e.target.value)}
              placeholder="As printed on the card — only if the advert asks"
            />
          </Field>
          <Field label="LinkedIn">
            <Input
              value={p.linkedin}
              onChange={(e) => setP("linkedin", e.target.value)}
              placeholder="linkedin.com/in/…"
            />
          </Field>
          <Field label="Website">
            <Input value={p.website} onChange={(e) => setP("website", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Draft name" className="sm:col-span-2">
            <Input
              value={cv.name}
              onChange={(e) => set((cur) => ({ ...cur, name: e.target.value }))}
              placeholder="Internal name for this draft"
            />
          </Field>
        </div>
      </Block>
    </div>
  );
}

function LetterForm({ cv, set }: { cv: CV; set: (patch: (cur: CV) => CV) => void }) {
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState(false);
  const upgrade = useUpgrade();

  async function write() {
    if (!job.trim()) {
      toast.error("Paste the job advert first.");
      return;
    }
    setBusy(true);
    try {
      const res = await runCvAi({ data: { task: "letter", cv, job: job.trim() } });
      if (!res.ok) {
        if ("code" in res && res.code === "upgrade") upgrade(res.error);
        else toast.error(res.error);
        return;
      }
      if (res.kind !== "letter") return;
      set((cur) => ({ ...cur, coverLetter: res.text }));
      toast.success("Cover letter drafted");
    } catch {
      toast.error("Could not write the letter");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Block title="Job advert">
        <Textarea
          value={job}
          onChange={(e) => setJob(e.target.value)}
          className="min-h-[120px]"
          placeholder="Paste the advert. Career Pro writes a one-page letter from your CV — it will not invent experience."
        />
        <Button className="mt-3" onClick={() => void write()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Write cover letter
        </Button>
      </Block>
      <Block title="Letter">
        <Textarea
          value={cv.coverLetter}
          onChange={(e) => set((cur) => ({ ...cur, coverLetter: e.target.value }))}
          className="min-h-[280px]"
          placeholder="The compiled letter prints after your CV."
        />
      </Block>
    </div>
  );
}

function MoreForm({ cv, set }: { cv: CV; set: (patch: (cur: CV) => CV) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="font-display text-xl font-medium">Referees</h2>
        <p className="text-sm text-muted">Two named referees with a phone number is the Ugandan default.</p>
        {cv.referees.map((item) => (
          <Block
            key={item.id}
            title={item.name || "Referee"}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove referee"
                onClick={() =>
                  set((cur) => ({ ...cur, referees: cur.referees.filter((r) => r.id !== item.id) }))
                }
              >
                <Trash2 />
              </Button>
            }
          >
            <RefereeFields
              item={item}
              onChange={(next) =>
                set((cur) => ({
                  ...cur,
                  referees: cur.referees.map((r) => (r.id === item.id ? next : r)),
                }))
              }
            />
          </Block>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              referees: [
                ...cur.referees,
                { id: uid(), name: "", title: "", organisation: "", phone: "", email: "" },
              ],
            }))
          }
        >
          <Plus />
          Add referee
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-medium">Projects</h2>
        {cv.projects.map((item) => (
          <Block
            key={item.id}
            title={item.name || "Project"}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove project"
                onClick={() =>
                  set((cur) => ({
                    ...cur,
                    projects: cur.projects.filter((p) => p.id !== item.id),
                  }))
                }
              >
                <Trash2 />
              </Button>
            }
          >
            <ProjectFields
              item={item}
              onChange={(next) =>
                set((cur) => ({
                  ...cur,
                  projects: cur.projects.map((p) => (p.id === item.id ? next : p)),
                }))
              }
            />
          </Block>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              projects: [...cur.projects, { id: uid(), name: "", url: "", summary: "", bullets: [""] }],
            }))
          }
        >
          <Plus />
          Add project
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-medium">Additional</h2>
        {cv.extras.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_auto]"
          >
            <Input
              value={item.label}
              placeholder="Label"
              onChange={(e) =>
                set((cur) => ({
                  ...cur,
                  extras: cur.extras.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x)),
                }))
              }
            />
            <Input
              value={item.value}
              placeholder="Value"
              onChange={(e) =>
                set((cur) => ({
                  ...cur,
                  extras: cur.extras.map((x) => (x.id === item.id ? { ...x, value: e.target.value } : x)),
                }))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove"
              onClick={() =>
                set((cur) => ({
                  ...cur,
                  extras: cur.extras.filter((x) => x.id !== item.id),
                }))
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            set((cur) => ({
              ...cur,
              extras: [...cur.extras, { id: uid(), label: "", value: "" } satisfies ExtraItem],
            }))
          }
        >
          <Plus />
          Add line
        </Button>
      </div>
    </div>
  );
}

function ExperienceCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ExperienceItem;
  index: number;
  onChange: (next: ExperienceItem) => void;
  onRemove: () => void;
}) {
  return (
    <Block
      title={item.role || item.company || `Role ${index + 1}`}
      action={
        <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label="Remove role">
          <Trash2 />
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role">
          <Input value={item.role} onChange={(e) => onChange({ ...item, role: e.target.value })} />
        </Field>
        <Field label="Organisation">
          <Input value={item.company} onChange={(e) => onChange({ ...item, company: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={item.location} onChange={(e) => onChange({ ...item, location: e.target.value })} />
        </Field>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Start">
            <Input value={item.start} onChange={(e) => onChange({ ...item, start: e.target.value })} placeholder="2022" />
          </Field>
          <Field label="End">
            <Input
              value={item.end}
              onChange={(e) => onChange({ ...item, end: e.target.value })}
              placeholder="2024"
              disabled={item.current}
            />
          </Field>
          <label className="flex h-11 items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={item.current}
              onChange={(e) => onChange({ ...item, current: e.target.checked, end: e.target.checked ? "" : item.end })}
              className="size-4 accent-[var(--color-primary)]"
            />
            Now
          </label>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted">Bullets</Label>
        {item.bullets.map((b, i) => {
          const issues = lintBullet(b);
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-start gap-2">
                <Textarea
                  value={b}
                  className="min-h-[76px]"
                  onChange={(e) => {
                    const bullets = [...item.bullets];
                    bullets[i] = e.target.value;
                    onChange({ ...item, bullets });
                  }}
                  placeholder="Led … resulting in …"
                />
                <div className="flex flex-col gap-1">
                  <ImproveButton
                    text={b}
                    role={item.role}
                    company={item.company}
                    onApply={(text) => {
                      const bullets = [...item.bullets];
                      bullets[i] = text;
                      onChange({ ...item, bullets });
                    }}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove bullet"
                    onClick={() => onChange({ ...item, bullets: item.bullets.filter((_, j) => j !== i) })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {b.trim() && issues[0] ? (
                <p className="text-xs text-warn">{issues[0].hint}</p>
              ) : b.trim() ? (
                <p className="text-xs text-primary">Tight.</p>
              ) : null}
            </div>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => onChange({ ...item, bullets: [...item.bullets, ""] })}>
          <Plus />
          Add bullet
        </Button>
      </div>
    </Block>
  );
}

function EduFields({ item, onChange }: { item: EducationItem; onChange: (n: EducationItem) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="School" className="sm:col-span-2">
        <Input
          value={item.school}
          onChange={(e) => onChange({ ...item, school: e.target.value })}
          placeholder="Makerere University"
        />
      </Field>
      <Field label="Degree">
        <Input value={item.degree} onChange={(e) => onChange({ ...item, degree: e.target.value })} placeholder="B.A." />
      </Field>
      <Field label="Field">
        <Input value={item.field} onChange={(e) => onChange({ ...item, field: e.target.value })} />
      </Field>
      <Field label="Start">
        <Input value={item.start} onChange={(e) => onChange({ ...item, start: e.target.value })} />
      </Field>
      <Field label="End">
        <Input value={item.end} onChange={(e) => onChange({ ...item, end: e.target.value })} />
      </Field>
      <Field label="Note" className="sm:col-span-2">
        <Input
          value={item.details}
          onChange={(e) => onChange({ ...item, details: e.target.value })}
          placeholder="Class, dissertation, licence"
        />
      </Field>
    </div>
  );
}

function ProjectFields({ item, onChange }: { item: ProjectItem; onChange: (n: ProjectItem) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
        </Field>
        <Field label="URL">
          <Input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} />
        </Field>
      </div>
      <Field label="One line">
        <Input value={item.summary} onChange={(e) => onChange({ ...item, summary: e.target.value })} />
      </Field>
      {item.bullets.map((b, i) => (
        <Textarea
          key={i}
          value={b}
          className="min-h-[68px]"
          placeholder="Impact"
          onChange={(e) => {
            const bullets = [...item.bullets];
            bullets[i] = e.target.value;
            onChange({ ...item, bullets });
          }}
        />
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange({ ...item, bullets: [...item.bullets, ""] })}>
        <Plus />
        Add bullet
      </Button>
    </div>
  );
}

function SkillFields({ item, onChange }: { item: SkillGroup; onChange: (n: SkillGroup) => void }) {
  return (
    <div className="grid gap-3">
      <Field label="Category">
        <Input
          value={item.category}
          onChange={(e) => onChange({ ...item, category: e.target.value })}
          placeholder="MEAL, Languages, Computer packages"
        />
      </Field>
      <Field label="Items">
        <Textarea
          value={item.items}
          className="min-h-[80px]"
          onChange={(e) => onChange({ ...item, items: e.target.value })}
          placeholder="Comma-separated"
        />
      </Field>
    </div>
  );
}

function RefereeFields({ item, onChange }: { item: Referee; onChange: (n: Referee) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" className="sm:col-span-2">
        <Input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      </Field>
      <Field label="Title">
        <Input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} />
      </Field>
      <Field label="Organisation">
        <Input value={item.organisation} onChange={(e) => onChange({ ...item, organisation: e.target.value })} />
      </Field>
      <Field label="Phone">
        <Input value={item.phone} onChange={(e) => onChange({ ...item, phone: e.target.value })} placeholder="+256 …" />
      </Field>
      <Field label="Email">
        <Input value={item.email} onChange={(e) => onChange({ ...item, email: e.target.value })} />
      </Field>
    </div>
  );
}
