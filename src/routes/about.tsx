import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Kampala</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
          Advanced CV software, written for Uganda.
        </h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
          <p>
            KwetuCV is a professional writing studio for curricula vitae. It compiles a real A4 page as you type,
            scores wording the way a hiring panel reads it, and — on Writer and Career Pro — uses AI to rewrite,
            review, tailor, scan a National ID, and finish a complete CV from your notes.
          </p>
          <p>
            It is built around how Uganda actually hires: passport photos, nationality, NIN when asked, named
            referees, Makerere and Kyambogo on the education line, UGX in your impact bullets, and job categories
            from public service to oil and gas. Prices are in Ugandan shillings. You pay with MTN MoMo, Airtel Money,
            or card.
          </p>
          <p>
            KwetuCV is software for individuals. It is not a ministry, not NIRA, not NITA-U, and not an employer. We
            do not submit applications on your behalf. You remain responsible for every fact on the page you send.
            Use it only for lawful employment, study, and professional purposes.
          </p>
          <p>
            Accounts are first-class. Create one with email and a password, or continue with Google or X. Drafts and
            the plan you paid for are stored against that account so they are not forgotten when you change phones.
          </p>
          <p>
            We designed KwetuCV to stand among the most complete CV products available to Ugandan professionals —
            compile, coach, identity import, cover letters, and local payments in one studio — without pretending to
            a government licence we do not hold.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/login">Create an account</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/pricing">UGX pricing</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
