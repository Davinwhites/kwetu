import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-8">
        <h1 className="font-display text-4xl font-medium tracking-tight">Privacy notice</h1>
        <p className="mt-2 text-sm text-subtle">For users in Uganda. Last updated September 2026.</p>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            KwetuCV processes personal data to provide CV software: your name, email, account sign-in, CV contents,
            passport photo, optional National ID fields, and payment records. We handle this under the Data Protection
            and Privacy Act, 2019, as a data controller for your account.
          </p>
          <p>
            We use your data to keep your account, save drafts, run AI tools you start, and record subscriptions you
            pay for. We do not sell CVs. We do not use a National ID image to identify you to anyone else. Scan results
            stay on your CV until you delete them.
          </p>
          <p>
            AI requests are sent to the model provider only when you press an AI button. Do not put other people’s
            sensitive data into notes unless you have a lawful reason.
          </p>
          <p>
            You may request access, correction, or deletion of your account data. Sign in from the same email to reach
            your drafts. We do not expire accounts for inactivity.
          </p>
          <p>
            This notice is information, not legal advice. If you are under 18, use KwetuCV only with a parent or
            guardian for lawful school or work applications.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
