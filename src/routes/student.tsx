import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { StudentLab } from "@/components/student-lab";
import { SignInGate } from "@/lib/auth/gates";

export const Route = createFileRoute("/student")({ component: StudentPage });

function StudentPage() {
  return <div className="min-h-dvh bg-background"><SiteHeader /><SignInGate><StudentLab /></SignInGate><SiteFooter /></div>;
}
