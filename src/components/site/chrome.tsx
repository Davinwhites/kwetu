import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Wordmark } from "@/components/cv/wordmark";
import { Button } from "@/components/ui/button";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-28 animate-pulse rounded-full bg-surface" />;
  }
  if (user) {
    return (
      <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex">
          <Link to="/studio">Studio</Link>
        </Button>
        <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex">
          <Link to="/student">Student lab</Link>
        </Button>
        <UserButton />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/login">Create account</Link>
      </Button>
    </div>
  );
}

export function SiteHeader({ compact }: { compact?: boolean }) {
  return (
    <header className="no-print border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Wordmark />
        {!compact ? (
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/about" className="hover:text-foreground">
              About
            </Link>
          </nav>
        ) : null}
        <AuthSlot />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <p className="font-display text-lg text-foreground">KwetuCV</p>
          <p className="mt-1 max-w-sm">
            Professional CV software for Uganda. Prices in Ugandan shillings. Accounts are stored and stay with you.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/studio" className="hover:text-foreground">
            Studio
          </Link>
          <Link to="/student" className="hover:text-foreground">
            Student lab
          </Link>
        </div>
      </div>
    </footer>
  );
}
