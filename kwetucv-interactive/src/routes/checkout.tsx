import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  CHANNELS,
  CHECKOUT_PLANS,
  PLANS,
  formatUgx,
  periodLabel,
  type ChannelId,
  type PlanId,
} from "@/lib/billing/plans";
import { completeCheckout } from "@/lib/data/billing";
import { cn } from "@/lib/utils";

type Search = { plan?: string };

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: typeof s.plan === "string" ? s.plan : undefined,
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, isPending } = useCurrentUserState();
  const { plan: planParam } = Route.useSearch();
  const navigate = useNavigate();
  const planId: PlanId = CHECKOUT_PLANS.includes(planParam as PlanId) ? (planParam as PlanId) : "pro";
  const plan = PLANS[planId];
  const [channel, setChannel] = useState<ChannelId>("mtn");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const channelMeta = useMemo(() => CHANNELS.find((c) => c.id === channel)!, [channel]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20">
          <div className="h-64 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  async function pay() {
    setBusy(true);
    try {
      const res = await completeCheckout({
        data: { plan: planId, channel, phone: phone.trim() || undefined },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment received. Your plan is on this account.");
      void navigate({ to: "/studio" });
    } catch {
      toast.error("Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_0.9fr] sm:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Checkout · UGX</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">{plan.name}</h1>
          <p className="mt-2 text-muted">{plan.tagline}</p>
          <p className="mt-4 font-display text-4xl font-medium tabular-nums">
            {formatUgx(plan.priceUgx)}{" "}
            <span className="text-lg text-muted">{periodLabel(plan)}</span>
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-8 text-sm">
            Switch plan:{" "}
            {CHECKOUT_PLANS.map((id) => (
              <Link
                key={id}
                to="/checkout"
                search={{ plan: id }}
                className={cn("mr-3 underline-offset-4 hover:underline", id === planId && "text-primary")}
              >
                {PLANS[id].name}
              </Link>
            ))}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-display text-xl font-medium">Payment channel</h2>
          <p className="mt-1 text-sm text-muted">Choose how you want to pay in Uganda.</p>
          <div className="mt-4 grid gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors duration-[var(--motion-quick)]",
                  channel === c.id
                    ? "border-primary bg-primary/8 text-foreground"
                    : "border-border bg-background text-muted hover:text-foreground",
                )}
              >
                <span className="block font-medium">{c.label}</span>
                <span className="block text-xs text-subtle">{c.hint}</span>
              </button>
            ))}
          </div>

          {channelMeta.kind === "momo" ? (
            <label className="mt-5 grid gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Mobile number</span>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+256 772 000 000"
                inputMode="tel"
              />
            </label>
          ) : (
            <p className="mt-5 text-sm text-muted">
              Card payments are confirmed on your account without collecting a full card number in this studio (PCI).
              Confirm below to attach {formatUgx(plan.priceUgx)} to this KwetuCV account.
            </p>
          )}

          <Button className="mt-6 w-full" onClick={() => void pay()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Pay {formatUgx(plan.priceUgx)} with {channelMeta.label}
          </Button>
          <p className="mt-3 text-xs text-subtle">
            By paying you agree to the{" "}
            <Link to="/terms" className="underline-offset-4 hover:underline">
              Terms
            </Link>
            . The plan is stored on {user.primaryEmail ?? "your account"} and remains until it ends — it is not
            forgotten when you leave this page.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
