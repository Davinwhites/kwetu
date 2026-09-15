import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { CV } from "@/lib/cv/types";
import { contactLine, particulars } from "@/lib/cv/score";
import { cn } from "@/lib/utils";

function dates(start: string, end: string, current: boolean) {
  const a = start.trim();
  const b = current ? "Present" : end.trim();
  if (!a && !b) return "";
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

function hasText(s: string | undefined) {
  return Boolean(s && s.trim());
}

function Sec({
  title,
  children,
  dense,
}: {
  title: string;
  children: ReactNode;
  dense?: boolean;
}) {
  if (!children) return null;
  return (
    <section className={cn("cv-sec", dense && "cv-sec-dense")}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  const list = items.map((b) => b.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul>
      {list.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function SummaryBlock({ cv, title = "Summary" }: { cv: CV; title?: string }) {
  if (!hasText(cv.summary)) return null;
  return (
    <Sec title={title}>
      <p className="cv-summary">{cv.summary}</p>
    </Sec>
  );
}

function ExperienceBlock({ cv }: { cv: CV }) {
  const items = cv.experience.filter((e) => hasText(e.company) || hasText(e.role));
  if (!items.length) return null;
  return (
    <Sec title="Experience">
      {items.map((e) => (
        <div key={e.id} className="cv-job">
          <div className="cv-job-head">
            <div>
              <p className="cv-job-role">
                {e.role || "Role"}
                {hasText(e.company) ? <span className="cv-job-co"> · {e.company}</span> : null}
              </p>
              {hasText(e.location) ? <p className="cv-meta">{e.location}</p> : null}
            </div>
            <p className="cv-dates">{dates(e.start, e.end, e.current)}</p>
          </div>
          <Bullets items={e.bullets} />
        </div>
      ))}
    </Sec>
  );
}

function EducationBlock({ cv }: { cv: CV }) {
  const items = cv.education.filter((e) => hasText(e.school));
  if (!items.length) return null;
  return (
    <Sec title="Education">
      {items.map((e) => (
        <div key={e.id} className="cv-job">
          <div className="cv-job-head">
            <p className="cv-job-role">
              {e.school}
              {hasText(e.degree) || hasText(e.field) ? (
                <span className="cv-job-co">
                  {" "}
                  · {[e.degree, e.field].filter((x) => hasText(x)).join(" ")}
                </span>
              ) : null}
            </p>
            <p className="cv-dates">{dates(e.start, e.end, false)}</p>
          </div>
          {hasText(e.details) ? <p className="cv-meta">{e.details}</p> : null}
        </div>
      ))}
    </Sec>
  );
}

function ProjectsBlock({ cv }: { cv: CV }) {
  const items = cv.projects.filter((p) => hasText(p.name));
  if (!items.length) return null;
  return (
    <Sec title="Projects">
      {items.map((p) => (
        <div key={p.id} className="cv-job">
          <p className="cv-job-role">
            {p.name}
            {hasText(p.url) ? <span className="cv-job-co"> · {p.url}</span> : null}
          </p>
          {hasText(p.summary) ? <p className="cv-meta">{p.summary}</p> : null}
          <Bullets items={p.bullets} />
        </div>
      ))}
    </Sec>
  );
}

function SkillsBlock({ cv }: { cv: CV }) {
  const items = cv.skills.filter((s) => hasText(s.items));
  if (!items.length) return null;
  return (
    <Sec title="Skills">
      <div className="cv-skills">
        {items.map((s) => (
          <p key={s.id}>
            {hasText(s.category) ? <strong>{s.category} · </strong> : null}
            {s.items}
          </p>
        ))}
      </div>
    </Sec>
  );
}

function ExtrasBlock({ cv }: { cv: CV }) {
  const items = cv.extras.filter((e) => hasText(e.value));
  if (!items.length) return null;
  return (
    <Sec title="Additional">
      {items.map((e) => (
        <p key={e.id} className="cv-extra">
          {hasText(e.label) ? <strong>{e.label} · </strong> : null}
          {e.value}
        </p>
      ))}
    </Sec>
  );
}

function RefereesBlock({ cv }: { cv: CV }) {
  const items = cv.referees.filter((r) => hasText(r.name));
  if (!items.length) return null;
  return (
    <Sec title="Referees">
      {items.map((r) => (
        <div key={r.id} className="cv-referee">
          <p className="cv-job-role">{r.name}</p>
          <p className="cv-meta">
            {[r.title, r.organisation].filter((x) => hasText(x)).join(" · ")}
          </p>
          <p className="cv-meta">{[r.phone, r.email].filter((x) => hasText(x)).join(" · ")}</p>
        </div>
      ))}
    </Sec>
  );
}

function Photo({ cv }: { cv: CV }) {
  if (hasText(cv.personal.photoDataUrl)) {
    return <img src={cv.personal.photoDataUrl} alt="" className="cv-photo" />;
  }
  return <div className="cv-photo cv-photo-empty">Photo</div>;
}

function Particulars({ cv }: { cv: CV }) {
  const rows = particulars(cv);
  if (!rows.length) return null;
  return (
    <div className="cv-particulars">
      {rows.map((row) => (
        <p key={row.label}>
          <span>{row.label}: </span>
          {row.value}
        </p>
      ))}
    </div>
  );
}

function Header({ cv, kicker }: { cv: CV; kicker?: boolean }) {
  const line = contactLine(cv);
  return (
    <header className="cv-head">
      <p className={cn("cv-name", kicker && "cv-name-band")}>{cv.personal.fullName || "Your name"}</p>
      {hasText(cv.personal.title) ? <p className="cv-title">{cv.personal.title}</p> : null}
      {line.length ? <p className="cv-contact">{line.join("  ·  ")}</p> : null}
    </header>
  );
}

function Body({ cv }: { cv: CV }) {
  return (
    <>
      <SummaryBlock cv={cv} />
      <ExperienceBlock cv={cv} />
      <EducationBlock cv={cv} />
      <ProjectsBlock cv={cv} />
      <SkillsBlock cv={cv} />
      <ExtrasBlock cv={cv} />
      <RefereesBlock cv={cv} />
    </>
  );
}

export function CvDocument({ cv, className }: { cv: CV; className?: string }) {
  const empty =
    !hasText(cv.personal.fullName) &&
    !hasText(cv.summary) &&
    !cv.experience.some((e) => hasText(e.role) || hasText(e.company));

  if (cv.template === "official") {
    return (
      <article className={cn("cv-sheet cv-official", className)} data-template="official">
        <header className="cv-head-official">
          <div>
            <p className="cv-name">{cv.personal.fullName || "Your name"}</p>
            {hasText(cv.personal.title) ? <p className="cv-title">{cv.personal.title}</p> : null}
            {contactLine(cv).length ? <p className="cv-contact">{contactLine(cv).join("  ·  ")}</p> : null}
            <Particulars cv={cv} />
          </div>
          <Photo cv={cv} />
        </header>
        {empty ? (
          <p className="cv-empty">Start writing in the left panel. This page compiles as you go.</p>
        ) : (
          <>
            <SummaryBlock cv={cv} title="Career objective" />
            <ExperienceBlock cv={cv} />
            <EducationBlock cv={cv} />
            <SkillsBlock cv={cv} />
            <ProjectsBlock cv={cv} />
            <ExtrasBlock cv={cv} />
            <RefereesBlock cv={cv} />
          </>
        )}
      </article>
    );
  }

  if (cv.template === "modern") {
    const line = contactLine(cv);
    const skills = cv.skills.filter((s) => hasText(s.items));
    const extras = cv.extras.filter((e) => hasText(e.value));
    return (
      <article className={cn("cv-sheet cv-modern", className)} data-template="modern">
        <aside className="cv-rail">
          {hasText(cv.personal.photoDataUrl) ? (
            <img src={cv.personal.photoDataUrl} alt="" className="cv-photo" />
          ) : null}
          <p className="cv-name">{cv.personal.fullName || "Your name"}</p>
          {hasText(cv.personal.title) ? <p className="cv-title">{cv.personal.title}</p> : null}
          {line.length ? (
            <ul className="cv-rail-list">
              {line.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {skills.length ? (
            <div>
              <h2>Skills</h2>
              {skills.map((s) => (
                <p key={s.id}>
                  {hasText(s.category) ? <strong>{s.category}</strong> : null}
                  <span>{s.items}</span>
                </p>
              ))}
            </div>
          ) : null}
          {extras.length ? (
            <div>
              <h2>More</h2>
              {extras.map((e) => (
                <p key={e.id}>
                  {hasText(e.label) ? <strong>{e.label}</strong> : null}
                  <span>{e.value}</span>
                </p>
              ))}
            </div>
          ) : null}
        </aside>
        <div className="cv-main">
          {empty ? <p className="cv-empty">Start writing in the left panel. This page compiles as you go.</p> : null}
          <SummaryBlock cv={cv} />
          <ExperienceBlock cv={cv} />
          <EducationBlock cv={cv} />
          <ProjectsBlock cv={cv} />
          <RefereesBlock cv={cv} />
        </div>
      </article>
    );
  }

  return (
    <article className={cn("cv-sheet", `cv-${cv.template}`, className)} data-template={cv.template}>
      <Header cv={cv} kicker={cv.template === "executive"} />
      {empty ? <p className="cv-empty">Start writing in the left panel. This page compiles as you go.</p> : <Body cv={cv} />}
    </article>
  );
}

const PAGE_W = 794;
const PAGE_H = 1123;

export function CvStage({ cv }: { cv: CV }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      setScale(Math.max(0.28, Math.min(1, (w - 8) / PAGE_W)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="cv-stage">
      <div className="cv-stage-inner" style={{ height: PAGE_H * scale }}>
        <div
          className="cv-stage-page"
          style={{
            width: PAGE_W,
            minHeight: PAGE_H,
            transform: `translateX(-50%) scale(${scale})`,
          }}
        >
          <CvDocument cv={cv} />
        </div>
      </div>
    </div>
  );
}
