import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Wordmark } from "@/components/cv/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  const { redirect } = Route.useSearch();
  const next = redirect && redirect.startsWith("/") ? redirect : "/studio";
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <div className="h-10 w-48 animate-pulse rounded-full bg-surface" />
      </main>
    );
  }
  if (user) return <Navigate to="/studio" />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "Member",
          callbackURL: next,
        });
        if (res.error) {
          setError(res.error.message ?? "Could not create that account.");
          return;
        }
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: next,
        });
        if (res.error) {
          setError(res.error.message ?? "Those details did not match an account.");
          return;
        }
      }
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <Wordmark />
        <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
          {mode === "up" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Accounts are stored permanently. Sign in from any device with the same email — drafts follow you. We do not
          close accounts for inactivity.
        </p>

        {authEnabled ? (
          <>
            <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
              {mode === "up" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Namukasa Rebecca"
                    autoComplete="name"
                  />
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted">
              {mode === "up" ? (
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => setMode("in")}>
                  Already have an account? Sign in
                </button>
              ) : (
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => setMode("up")}>
                  New here? Create an account
                </button>
              )}
            </p>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-subtle">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: next })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}

        <p className="mt-6 text-center text-xs text-subtle">
          By continuing you agree to the{" "}
          <Link to="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Privacy notice
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
