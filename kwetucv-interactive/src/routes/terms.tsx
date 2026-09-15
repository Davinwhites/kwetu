import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-8">
        <h1 className="font-display text-4xl font-medium tracking-tight">Terms of use</h1>
        <p className="mt-2 text-sm text-subtle">Lawful personal use. Last updated September 2026.</p>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            KwetuCV is professional software for writing your own curriculum vitae and cover letter. By creating an
            account you agree to use it only for lawful employment, study, and professional purposes. You must not use
            it to impersonate another person, forge identity documents, or mislead an employer.
          </p>
          <p>
            You own the text you write. AI suggestions are a drafting aid. You must check every fact, date, grade, and
            NIN before you send a CV. KwetuCV is not a party to any job application and is not affiliated with the
            Ministry of Public Service, NIRA, NITA-U, or any employer.
          </p>
          <p>
            Subscriptions and one-time Finish credits are priced in Ugandan shillings and charged through the payment
            channel you choose (MTN MoMo, Airtel Money, or card). Completing checkout attaches the plan to your saved
            account. Paid periods do not auto-extend in this studio unless you pay again.
          </p>
          <p>
            Accounts are stored so you can return. Keep your password. If you sign in with Google or X, that provider’s
            terms also apply. We may suspend accounts used for fraud or abuse.
          </p>
          <p>
            The software is provided as-is. We work to keep it available and among the most capable CV studios for
            Ugandan professionals, but we do not warrant that a particular application will succeed.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
