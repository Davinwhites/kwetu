import type { CV } from "./types";

export const ACTION_VERBS = [
  "led",
  "owned",
  "built",
  "shipped",
  "designed",
  "launched",
  "drove",
  "cut",
  "grew",
  "reduced",
  "increased",
  "improved",
  "created",
  "delivered",
  "negotiated",
  "mentored",
  "hired",
  "scaled",
  "automated",
  "rewrote",
  "migrated",
  "architected",
  "introduced",
  "established",
  "secured",
  "closed",
  "won",
  "saved",
  "raised",
  "partnered",
  "replaced",
  "rebuilt",
  "streamlined",
  "standardised",
  "standardized",
  "authored",
  "published",
  "taught",
  "trained",
  "directed",
  "managed",
  "coordinated",
  "implemented",
  "developed",
  "engineered",
  "optimised",
  "optimized",
  "analysed",
  "analyzed",
  "researched",
  "presented",
  "facilitated",
  "founded",
  "spearheaded",
  "orchestrated",
  "transformed",
  "accelerated",
  "expanded",
  "consolidated",
  "compiled",
  "supervised",
  "supported",
  "conducted",
  "drafted",
  "mobilised",
  "mobilized",
];

const WEAK = [
  /responsible for/i,
  /helped (to )?/i,
  /worked on/i,
  /tasked with/i,
  /duties included/i,
  /assisted with/i,
  /\bvarious\b/i,
  /\bseveral\b/i,
  /participated in/i,
  /was involved/i,
  /\bi\b/i,
  /\bmy\b/i,
  /\bwe\b/i,
];

export type BulletIssue = {
  code: "weak" | "metric" | "verb" | "length" | "empty";
  hint: string;
};

export function lintBullet(text: string): BulletIssue[] {
  const t = text.trim();
  if (!t) return [{ code: "empty", hint: "Write the impact, not the task list." }];
  const issues: BulletIssue[] = [];
  const first = t.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "").toLowerCase() ?? "";
  if (!ACTION_VERBS.includes(first)) {
    issues.push({
      code: "verb",
      hint: "Start with a sharp action verb (Led, Compiled, Cut).",
    });
  }
  if (!/\d/.test(t)) {
    issues.push({
      code: "metric",
      hint: "Add a number: UGX, %, people, districts, or time.",
    });
  }
  const words = t.split(/\s+/).length;
  if (words > 32) {
    issues.push({
      code: "length",
      hint: "Trim to one line — roughly 18–28 words.",
    });
  }
  if (WEAK.some((re) => re.test(t))) {
    issues.push({
      code: "weak",
      hint: "Drop filler like “responsible for” or first person.",
    });
  }
  return issues;
}

export type ScorePart = {
  id: string;
  label: string;
  score: number;
  max: number;
  hints: string[];
};

export type CvScore = {
  total: number;
  parts: ScorePart[];
  bulletIssues: number;
};

function words(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function scoreCv(cv: CV): CvScore {
  const parts: ScorePart[] = [];
  const p = cv.personal;

  const identityHints: string[] = [];
  let identity = 0;
  if (p.fullName.trim()) identity += 4;
  else identityHints.push("Add your name as it appears on your National ID.");
  if (p.title.trim()) identity += 3;
  else identityHints.push("Add a target title, not a vague headline.");
  if (p.email.trim()) identity += 3;
  else identityHints.push("Add a professional email.");
  if (p.location.trim()) identity += 2;
  else identityHints.push("City helps — Kampala, Gulu, Mbarara…");
  if (p.phone.trim() || p.linkedin.trim() || p.website.trim()) identity += 3;
  else identityHints.push("Add a Ugandan phone number.");
  if (p.nationality.trim()) identity += 2;
  else identityHints.push("Nationality is expected on official CVs.");
  if (p.photoDataUrl) identity += 3;
  else identityHints.push("A passport photo is expected for many Ugandan applications.");
  parts.push({ id: "identity", label: "Identity", score: identity, max: 20, hints: identityHints });

  const w = words(cv.summary);
  const summaryHints: string[] = [];
  let summary = 0;
  if (w === 0) summaryHints.push("Write a 40–90 word pitch or career objective.");
  else {
    if (w >= 30 && w <= 100) summary += 10;
    else if (w >= 18) summary += 6;
    else summary += 3;
    if (w < 35) summaryHints.push("Give the reader a fuller pitch (aim 40–90 words).");
    if (w > 110) {
      summaryHints.push("Shorten the summary — three sentences is enough.");
      summary = Math.min(summary, 6);
    }
    if (!/\bI\b|\bmy\b/i.test(cv.summary)) summary += 5;
    else summaryHints.push("Write in implied first person, without “I” or “my”.");
  }
  parts.push({ id: "summary", label: "Summary", score: summary, max: 15, hints: summaryHints });

  const roles = cv.experience.filter((e) => e.company.trim() || e.role.trim());
  const expHints: string[] = [];
  let exp = 0;
  if (roles.length >= 2) exp += 8;
  else if (roles.length === 1) {
    exp += 4;
    expHints.push("Two roles (or one plus projects) reads more complete.");
  } else expHints.push("Add at least one role with dates.");
  const dated = roles.filter((e) => e.start.trim());
  if (dated.length === roles.length && roles.length) exp += 4;
  else if (roles.length) expHints.push("Every role needs a start year.");
  const bulletCount = roles.reduce((n, e) => n + e.bullets.filter((b) => b.trim()).length, 0);
  if (bulletCount >= 6) exp += 8;
  else if (bulletCount >= 3) exp += 5;
  else expHints.push("Aim for 3 strong bullets per recent role.");
  parts.push({ id: "experience", label: "Experience", score: exp, max: 20, hints: expHints });

  const allBullets = [
    ...cv.experience.flatMap((e) => e.bullets),
    ...cv.projects.flatMap((e) => e.bullets),
  ].filter((b) => b.trim());
  let evidence = 0;
  const evidenceHints: string[] = [];
  const withNum = allBullets.filter((b) => /\d/.test(b)).length;
  const withVerb = allBullets.filter((b) => {
    const first = b.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "").toLowerCase() ?? "";
    return ACTION_VERBS.includes(first);
  }).length;
  if (allBullets.length === 0) evidenceHints.push("Bullets should prove impact.");
  else {
    if (withNum / allBullets.length >= 0.6) evidence += 10;
    else if (withNum > 0) evidence += 5;
    else evidenceHints.push("Most bullets still lack a number.");
    if (withVerb / allBullets.length >= 0.7) evidence += 10;
    else if (withVerb > 0) evidence += 5;
    else evidenceHints.push("Lead bullets with action verbs.");
  }
  parts.push({ id: "evidence", label: "Evidence", score: evidence, max: 20, hints: evidenceHints });

  const skillItems = cv.skills
    .flatMap((g) => g.items.split(/[,/•|]/))
    .map((s) => s.trim())
    .filter(Boolean);
  const skillHints: string[] = [];
  let skills = 0;
  if (skillItems.length >= 8) skills += 8;
  else if (skillItems.length >= 4) skills += 5;
  else skillHints.push("List 8–14 skills grouped by theme.");
  parts.push({ id: "skills", label: "Skills", score: skills, max: 8, hints: skillHints });

  const eduOk = cv.education.some((e) => e.school.trim());
  parts.push({
    id: "education",
    label: "Education",
    score: eduOk ? 7 : 0,
    max: 7,
    hints: eduOk ? [] : ["Add school and degree — Makerere, Kyambogo, MUBS, UCU…"],
  });

  const refOk = cv.referees.filter((r) => r.name.trim() && (r.phone.trim() || r.email.trim())).length >= 2;
  parts.push({
    id: "referees",
    label: "Referees",
    score: refOk ? 10 : cv.referees.some((r) => r.name.trim()) ? 4 : 0,
    max: 10,
    hints: refOk ? [] : ["Ugandan employers expect two named referees with phone numbers."],
  });

  const total = Math.round(
    (parts.reduce((n, part) => n + part.score, 0) / parts.reduce((n, part) => n + part.max, 0)) * 100,
  );

  let bulletIssues = 0;
  for (const b of allBullets) bulletIssues += lintBullet(b).length;

  return { total, parts, bulletIssues };
}

export function contactLine(cv: CV) {
  const p = cv.personal;
  return [p.location, p.email, p.phone, p.website, p.linkedin, p.github]
    .map((s) => s.trim())
    .filter(Boolean);
}

export function particulars(cv: CV) {
  const p = cv.personal;
  const rows: { label: string; value: string }[] = [];
  if (p.nationality.trim()) rows.push({ label: "Nationality", value: p.nationality });
  if (p.dateOfBirth.trim()) rows.push({ label: "Date of birth", value: p.dateOfBirth });
  if (p.gender.trim()) rows.push({ label: "Sex", value: p.gender });
  if (p.nin.trim()) rows.push({ label: "NIN", value: p.nin });
  return rows;
}
