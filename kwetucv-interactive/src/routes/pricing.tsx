import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";
import { CHECKOUT_PLANS, PLANS, formatUgx, periodLabel } from "@/lib/billing/plans";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

function PricingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">UGX · MTN · Airtel · Card</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight">
          Subscriptions for a finished CV — priced for Uganda.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Starter is free forever. Writer unlocks the AI coach. Career Pro finishes a complete CV and cover letter
          from your notes. Pay in Ugandan shillings.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(["free", ...CHECKOUT_PLANS] as const).map((id) => {
            const plan = PLANS[id];
            return (
              <article
                key={id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)]"
              >
                {plan.featured ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Most chosen</p>
                ) : (
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">{periodLabel(plan)}</p>
                )}
                <h2 className="mt-2 font-display text-2xl font-medium">{plan.name}</h2>
                <p className="mt-2 font-display text-3xl font-medium tabular-nums">
                  {plan.priceUgx === 0 ? "UGX 0" : formatUgx(plan.priceUgx)}
                </p>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {id === "free" ? (
                  <Button className="mt-6" variant="secondary" asChild>
                    <Link to="/login">Create account</Link>
                  </Button>
                ) : (
                  <Button className="mt-6" variant={plan.featured ? "default" : "secondary"} asChild>
                    <Link to="/checkout" search={{ plan: id }}>
                      Continue
                    </Link>
                  </Button>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-10 max-w-2xl text-sm text-subtle">
          Checkout in this studio records the subscription on your KwetuCV account using MTN MoMo, Airtel Money, or
          card details you confirm. It is for lawful personal use: writing your own CV for employment. See Terms.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
