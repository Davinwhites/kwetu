export const PLAN_IDS = ["free", "writer", "pro", "pro_year", "finish"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const CHANNELS = [
  {
    id: "mtn",
    label: "MTN MoMo",
    hint: "Pay from any MTN line (077, 078, 076, 039).",
    kind: "momo" as const,
  },
  {
    id: "airtel",
    label: "Airtel Money",
    hint: "Pay from any Airtel line (070, 075, 074, 020).",
    kind: "momo" as const,
  },
  {
    id: "card",
    label: "Visa / Mastercard",
    hint: "Ugandan and international debit or credit cards.",
    kind: "card" as const,
  },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];

export type Plan = {
  id: PlanId;
  name: string;
  priceUgx: number;
  period: "forever" | "month" | "year" | "once";
  tagline: string;
  featured?: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    priceUgx: 0,
    period: "forever",
    tagline: "Write and compile on one page, on us.",
    features: [
      "2 saved CVs on your account",
      "Official and Editorial templates",
      "Passport photo and National ID fields",
      "Writing score as you type",
      "Print to PDF",
    ],
  },
  writer: {
    id: "writer",
    name: "Writer",
    priceUgx: 24_900,
    period: "month",
    tagline: "AI that tightens wording without inventing a career.",
    features: [
      "10 saved CVs",
      "All five templates",
      "AI rewrite and review (60 / month)",
      "National ID scan into your profile",
      "Job categories for Uganda",
    ],
  },
  pro: {
    id: "pro",
    name: "Career Pro",
    priceUgx: 59_900,
    period: "month",
    featured: true,
    tagline: "Finish a complete CV and cover letter with AI.",
    features: [
      "Unlimited CVs on your account",
      "Unlimited AI writing, review, and tailor",
      "Finish a CV from notes",
      "Cover letters aimed at a job advert",
      "National ID scan and passport photo",
      "Every category and template",
    ],
  },
  pro_year: {
    id: "pro_year",
    name: "Career Pro · year",
    priceUgx: 499_000,
    period: "year",
    tagline: "Two months free versus paying monthly.",
    features: [
      "Everything in Career Pro",
      "UGX 41,583 / month effective",
      "Account never lapses from inactivity",
    ],
  },
  finish: {
    id: "finish",
    name: "Finish one CV",
    priceUgx: 14_900,
    period: "once",
    tagline: "One complete AI pass — no subscription.",
    features: [
      "One Finish-with-AI credit",
      "20 AI rewrites",
      "Cover letter for that draft",
    ],
  },
};

export const CHECKOUT_PLANS: PlanId[] = ["writer", "pro", "pro_year", "finish"];

export function formatUgx(amount: number) {
  return `UGX ${amount.toLocaleString("en-US")}`;
}

export function periodLabel(plan: Plan) {
  if (plan.period === "forever") return "Free";
  if (plan.period === "once") return "one-time";
  if (plan.period === "year") return "/ year";
  return "/ month";
}

export type Entitlements = {
  plan: PlanId;
  status: "active" | "none";
  periodEnd: number | null;
  finishCredits: number;
  aiUsed: number;
  aiLimit: number | null;
  maxCvs: number;
  canRewrite: boolean;
  canReview: boolean;
  canTailor: boolean;
  canCompose: boolean;
  canScan: boolean;
  canLetter: boolean;
  allTemplates: boolean;
};

export function periodKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isPaidPlan(plan: PlanId) {
  return plan === "writer" || plan === "pro" || plan === "pro_year";
}

export function entitlementsFrom(row: {
  plan: string;
  status: string;
  periodEnd: number | null;
  finishCredits: number;
  aiUsed: number;
}): Entitlements {
  const now = Date.now();
  const activePaid =
    row.status === "active" &&
    isPaidPlan(row.plan as PlanId) &&
    (row.periodEnd == null || row.periodEnd > now);

  const plan: PlanId = activePaid ? (row.plan as PlanId) : "free";
  // AI tools are currently available to every account. Paid plans remain
  // visible in pricing and checkout for the future upgrade path.
  const aiLimit = null;
  const canAi = true;

  return {
    plan,
    status: activePaid ? "active" : "none",
    periodEnd: row.periodEnd,
    finishCredits: row.finishCredits,
    aiUsed: row.aiUsed,
    aiLimit,
    maxCvs: 10_000,
    canRewrite: canAi,
    canReview: canAi,
    canTailor: canAi,
    canCompose: canAi,
    canScan: canAi,
    canLetter: canAi,
    allTemplates: true,
  };
}

export function ugPhoneValid(raw: string) {
  const d = raw.replace(/[\s-]/g, "");
  if (/^\+256[7]\d{8}$/.test(d)) return true;
  if (/^0[7]\d{8}$/.test(d)) return true;
  if (/^256[7]\d{8}$/.test(d)) return true;
  return false;
}

export function normaliseUgPhone(raw: string) {
  const d = raw.replace(/[\s-]/g, "");
  if (d.startsWith("+256")) return d;
  if (d.startsWith("256")) return `+${d}`;
  if (d.startsWith("0")) return `+256${d.slice(1)}`;
  return d;
}
