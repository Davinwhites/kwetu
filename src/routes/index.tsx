import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";
import { CvDocument } from "@/components/cv/preview";
import { SAMPLE_CV } from "@/lib/cv/sample";
import { CATEGORIES } from "@/lib/cv/categories";
import { PLANS, formatUgx } from "@/lib/billing/plans";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-end gap-10 px-4 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Kampala · UGX · Mobile money</p>
            <h1 className="mt-4 max-w-xl font-display text-[2.4rem] font-medium leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              The CV studio built for Uganda.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              Write, compile onto a real A4 page, and finish with AI — photo, National ID, referees, and a cover letter
              included. Your account is saved. Prices are in Ugandan shillings.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/login">Create a free account</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/pricing">See UGX prices</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-subtle">
              For lawful job applications. Not a government service. You own every word you submit.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="pointer-events-none absolute inset-3 translate-x-2 translate-y-3 rounded-sm bg-card shadow-[var(--shadow-border)]" />
            <div className="relative overflow-hidden rounded-sm bg-paper shadow-[var(--shadow-border)]">
              <div className="folio-thumb">
                <div className="folio-thumb-page">
                  <CvDocument cv={SAMPLE_CV} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8">
            <Step n="01" title="Create an account" body="Use your email and password, or continue with Google. Drafts live on your account so they are not forgotten when you change phones." />
            <Step n="02" title="Write or finish with AI" body="Import a National ID photo, pick a Ugandan job category, and let the coach compile a complete page from your notes." />
            <Step n="03" title="Compile and send" body="Print to PDF. Official template carries photo, particulars, and referees the way panels in Kampala expect." />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight">Categories that match how Uganda hires</h2>
              <p className="mt-2 max-w-xl text-muted">Each category suggests skills, extras, and a template — public service, NGO, bank, hospital, ICT, and more.</p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-border)]">
                <p className="font-medium">{c.label}</p>
                <p className="mt-1 text-sm text-muted">{c.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
          <h2 className="font-display text-3xl font-medium tracking-tight">Priced in Ugandan shillings</h2>
          <p className="mt-2 max-w-xl text-muted">Pay with MTN MoMo, Airtel Money, or Visa / Mastercard. No dollar conversion at checkout.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {(["free", "writer", "pro"] as const).map((id) => {
              const plan = PLANS[id];
              return (
                <article
                  key={id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)]"
                >
                  <p className="text-sm font-medium text-muted">{plan.name}</p>
                  <p className="mt-2 font-display text-3xl font-medium tabular-nums">
                    {plan.priceUgx === 0 ? "Free" : formatUgx(plan.priceUgx)}
                  </p>
                  <p className="text-sm text-subtle">{plan.period === "month" ? "per month" : plan.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {id === "free" ? (
                    <Button className="mt-6" variant="secondary" asChild>
                      <Link to="/login">Start free</Link>
                    </Button>
                  ) : (
                    <Button className="mt-6" variant={id === "pro" ? "default" : "secondary"} asChild>
                      <Link to="/checkout" search={{ plan: id }}>
                        Subscribe
                      </Link>
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm tabular-nums text-primary">{n}</p>
      <h3 className="mt-2 font-display text-xl font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
