export const TEMPLATES = ["official", "editorial", "compact", "modern", "executive"] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export const TEMPLATE_META: Record<
  TemplateId,
  { label: string; blurb: string; ats: boolean }
> = {
  official: {
    label: "Official",
    blurb: "Passport photo, particulars, referees — the Uganda public-service page.",
    ats: true,
  },
  editorial: {
    label: "Editorial",
    blurb: "Single column, serif name, safest for ATS parsers.",
    ats: true,
  },
  compact: {
    label: "Compact",
    blurb: "Denser type for packing a long career onto one page.",
    ats: true,
  },
  modern: {
    label: "Modern",
    blurb: "Two-column layout with a pine rail for contact and skills.",
    ats: false,
  },
  executive: {
    label: "Executive",
    blurb: "Name-forward band, generous space, board-ready.",
    ats: true,
  },
};

export interface Personal {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  nationality: string;
  dateOfBirth: string;
  nin: string;
  gender: string;
  photoDataUrl: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  details: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  url: string;
  summary: string;
  bullets: string[];
}

export interface SkillGroup {
  id: string;
  category: string;
  items: string;
}

export interface ExtraItem {
  id: string;
  label: string;
  value: string;
}

export interface Referee {
  id: string;
  name: string;
  title: string;
  organisation: string;
  phone: string;
  email: string;
}

export interface CV {
  id: string;
  name: string;
  template: TemplateId;
  category: string;
  updatedAt: number;
  personal: Personal;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillGroup[];
  extras: ExtraItem[];
  referees: Referee[];
  coverLetter: string;
}

export const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "more", label: "More" },
  { id: "letter", label: "Letter" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
