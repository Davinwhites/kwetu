import { uid } from "@/lib/utils";
import type { CV, Personal, Referee, TemplateId } from "./types";
import { TEMPLATES } from "./types";

export function emptyPersonal(): Personal {
  return {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    nationality: "Ugandan",
    dateOfBirth: "",
    nin: "",
    gender: "",
    photoDataUrl: "",
  };
}

export function blankCv(partial?: Partial<CV>): CV {
  const id = partial?.id ?? uid();
  return {
    id,
    name: partial?.name ?? "Untitled CV",
    template: partial?.template ?? "official",
    category: partial?.category ?? "graduate",
    updatedAt: partial?.updatedAt ?? Date.now(),
    personal: { ...emptyPersonal(), ...partial?.personal },
    summary: partial?.summary ?? "",
    experience: partial?.experience ?? [
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
    education: partial?.education ?? [
      {
        id: uid(),
        school: "",
        degree: "",
        field: "",
        start: "",
        end: "",
        details: "",
      },
    ],
    projects: partial?.projects ?? [],
    skills: partial?.skills ?? [{ id: uid(), category: "Core", items: "" }],
    extras: partial?.extras ?? [],
    referees: partial?.referees ?? [
      {
        id: uid(),
        name: "",
        title: "",
        organisation: "",
        phone: "",
        email: "",
      },
    ],
    coverLetter: partial?.coverLetter ?? "",
  };
}

export function normalizeCv(raw: unknown): CV | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CV> & { personal?: Partial<Personal> };
  if (!r.personal || typeof r.personal !== "object") return null;
  const template = TEMPLATES.includes(r.template as TemplateId)
    ? (r.template as TemplateId)
    : "official";
  const referees: Referee[] = Array.isArray(r.referees) ? r.referees : [];
  return blankCv({
    id: typeof r.id === "string" ? r.id : uid(),
    name: typeof r.name === "string" ? r.name : "Untitled CV",
    template,
    category: typeof r.category === "string" ? r.category : "graduate",
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
    personal: { ...emptyPersonal(), ...r.personal },
    summary: typeof r.summary === "string" ? r.summary : "",
    experience: Array.isArray(r.experience) ? r.experience : undefined,
    education: Array.isArray(r.education) ? r.education : undefined,
    projects: Array.isArray(r.projects) ? r.projects : [],
    skills: Array.isArray(r.skills) ? r.skills : undefined,
    extras: Array.isArray(r.extras) ? r.extras : [],
    referees,
    coverLetter: typeof r.coverLetter === "string" ? r.coverLetter : "",
  });
}
