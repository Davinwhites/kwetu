import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { uid } from "@/lib/utils";
import {
  CHECKOUT_PLANS,
  CHANNELS,
  PLANS,
  entitlementsFrom,
  isPaidPlan,
  normaliseUgPhone,
  periodKey,
  ugPhoneValid,
  type ChannelId,
  type Entitlements,
  type PlanId,
} from "@/lib/billing/plans";

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sql = await getSql();
  const sub = await sql<{
    plan: string;
    status: string;
    period_end: number | string | null;
    finish_credits: number | string;
  }>`select plan, status, period_end, finish_credits from subscriptions where user_id = ${userId}`;
  const usage = await sql<{ count: number | string }>`select count from ai_usage where user_id = ${userId} and period = ${periodKey()}`;
  const row = sub[0];
  return entitlementsFrom({
    plan: row?.plan ?? "free",
    status: row?.status ?? "none",
    periodEnd: row?.period_end == null ? null : Number(row.period_end),
    finishCredits: Number(row?.finish_credits ?? 0),
    aiUsed: Number(usage[0]?.count ?? 0),
  });
}

export const fetchEntitlements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => getEntitlements(context.userId));

export const listPayments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      plan: string;
      amount_ugx: number | string;
      channel: string;
      phone: string | null;
      status: string;
      created_at: number | string;
    }>`select id, plan, amount_ugx, channel, phone, status, created_at from payments where user_id = ${context.userId} order by created_at desc limit 20`;
  });

type CheckoutInput = {
  plan: PlanId;
  channel: ChannelId;
  phone?: string;
};

export const completeCheckout = createServerFn({ method: "POST" })
  .validator((input: CheckoutInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!CHECKOUT_PLANS.includes(data.plan)) {
      return { ok: false as const, error: "Unknown plan" };
    }
    const channel = CHANNELS.find((c) => c.id === data.channel);
    if (!channel) return { ok: false as const, error: "Choose a payment channel" };

    let phone: string | null = null;
    if (channel.kind === "momo") {
      const raw = data.phone?.trim() ?? "";
      if (!ugPhoneValid(raw)) {
        return { ok: false as const, error: "Enter a valid Ugandan mobile number" };
      }
      phone = normaliseUgPhone(raw);
    }

    const plan = PLANS[data.plan];
    const now = Date.now();
    const paymentId = uid();
    const sql = await getSql();

    await sql`insert into payments (id, user_id, plan, amount_ugx, channel, phone, status, created_at) values (${paymentId}, ${context.userId}, ${plan.id}, ${plan.priceUgx}, ${channel.id}, ${phone}, ${"paid"}, ${now})`;

    const current = await sql<{
      plan: string;
      finish_credits: number | string;
      period_end: number | string | null;
    }>`select plan, finish_credits, period_end from subscriptions where user_id = ${context.userId}`;

    const finishCredits =
      data.plan === "finish"
        ? Number(current[0]?.finish_credits ?? 0) + 1
        : Number(current[0]?.finish_credits ?? 0);

    let nextPlan = current[0]?.plan ?? "free";
    let periodEnd: number | null =
      current[0]?.period_end == null ? null : Number(current[0].period_end);
    let status = "active";

    if (data.plan === "writer") {
      nextPlan = "writer";
      periodEnd = now + 30 * 24 * 60 * 60 * 1000;
    } else if (data.plan === "pro") {
      nextPlan = "pro";
      periodEnd = now + 30 * 24 * 60 * 60 * 1000;
    } else if (data.plan === "pro_year") {
      nextPlan = "pro_year";
      periodEnd = now + 365 * 24 * 60 * 60 * 1000;
    } else {
      if (!isPaidPlan(nextPlan as PlanId)) {
        nextPlan = "free";
        status = "active";
      }
    }

    await sql`insert into subscriptions (user_id, plan, status, period_end, finish_credits, channel, updated_at)
      values (${context.userId}, ${nextPlan}, ${status}, ${periodEnd}, ${finishCredits}, ${channel.id}, ${now})
      on conflict (user_id) do update set
        plan = excluded.plan,
        status = excluded.status,
        period_end = excluded.period_end,
        finish_credits = excluded.finish_credits,
        channel = excluded.channel,
        updated_at = excluded.updated_at`;

    const ents = await getEntitlements(context.userId);
    return { ok: true as const, paymentId, entitlements: ents };
  });

export async function consumeAi(userId: string, kind: "rewrite" | "review" | "tailor" | "compose" | "scan" | "letter" | "interview" | "student") {
  const ents = await getEntitlements(userId);
  const allowed =
    (kind === "rewrite" && ents.canRewrite) ||
    (kind === "review" && ents.canReview) ||
    (kind === "tailor" && ents.canTailor) ||
    (kind === "compose" && ents.canCompose) ||
    (kind === "scan" && ents.canScan) ||
    (kind === "letter" && ents.canLetter) ||
    (kind === "interview" && ents.canReview) ||
    (kind === "student" && (ents.canReview || ents.canRewrite));

  if (!allowed) {
    return { ok: false as const, error: "Upgrade to use this AI tool.", code: "upgrade" as const };
  }
  if (ents.aiLimit != null && ents.aiUsed >= ents.aiLimit) {
    return { ok: false as const, error: "This month’s AI allowance is used. Upgrade Career Pro for unlimited.", code: "upgrade" as const };
  }

  const sql = await getSql();
  const key = periodKey();
  const existing = await sql<{ count: number | string }>`select count from ai_usage where user_id = ${userId} and period = ${key}`;
  if (existing.length === 0) {
    await sql`insert into ai_usage (user_id, period, count) values (${userId}, ${key}, 1)`;
  } else {
    await sql`update ai_usage set count = count + 1 where user_id = ${userId} and period = ${key}`;
  }

  if (kind === "compose") {
    if (ents.plan !== "pro" && ents.plan !== "pro_year" && ents.finishCredits > 0) {
      await sql`update subscriptions set finish_credits = finish_credits - 1, updated_at = ${Date.now()} where user_id = ${userId}`;
    }
  }

  return { ok: true as const };
}
