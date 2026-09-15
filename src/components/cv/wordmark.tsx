import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("inline-flex items-baseline gap-2 text-foreground no-underline", className)}>
      <span className="font-display text-xl font-medium tracking-tight sm:text-2xl">KwetuCV</span>
      <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted sm:inline">Uganda</span>
    </Link>
  );
}
