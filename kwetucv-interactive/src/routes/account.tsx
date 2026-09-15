import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { fetchEntitlements, listPayments } from "@/lib/data/billing";
import { PLANS, formatUgx, type Entitlements } from "@/lib/billing/plans";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [payments, setPayments] = useState<
    { id: string; plan: string; amount_ugx: number | string; channel: string; status: string; created_at: number | string }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    void fetchEntitlements().then(setEnts).catch(() => setEnts(null));
    void listPayments().then(setPayments).catch(() => setPayments([]));
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader compact />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const plan = ents ? PLANS[ents.plan] : PLANS.free;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader compact />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Account</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Saved, and not forgotten</h1>
        <p className="mt-2 text-sm text-muted">
          This account stays in our records until you ask us to close it. Sign in with the same email on any phone or
          computer and your CVs are there.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Signed in as</p>
          <p className="mt-2 font-display text-xl">{user.displayName || "Member"}</p>
          <p className="text-sm text-muted">{user.primaryEmail || "No email on this sign-in method"}</p>
          <p className="mt-3 text-xs text-subtle">Account ID {user.id}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Plan</p>
          <p className="mt-2 font-display text-xl">{plan.name}</p>
          <p className="text-sm text-muted">
            {plan.priceUgx === 0 ? "Free forever" : formatUgx(plan.priceUgx)} ·{" "}
            {ents?.periodEnd ? `renews / ends ${new Date(ents.periodEnd).toLocaleDateString("en-UG")}` : "no end date"}
          </p>
          {ents ? (
            <p className="mt-2 text-sm text-muted">
              AI used this month: {ents.aiUsed}
              {ents.aiLimit == null ? " · unlimited" : ` / ${ents.aiLimit}`}
              {ents.finishCredits ? ` · ${ents.finishCredits} finish credit${ents.finishCredits === 1 ? "" : "s"}` : ""}
            </p>
          ) : null}
          <Button className="mt-4" asChild>
            <Link to="/pricing">Change plan</Link>
          </Button>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Payments</p>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No payments on this account yet.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <span>
                    {PLANS[p.plan as keyof typeof PLANS]?.name ?? p.plan} · {p.channel}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatUgx(Number(p.amount_ugx))} · {new Date(Number(p.created_at)).toLocaleDateString("en-UG")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-sm text-subtle">
          Questions about your data: see the{" "}
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Privacy notice
          </Link>
          . Built for lawful employment use in Uganda.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
