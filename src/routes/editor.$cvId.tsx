import { createFileRoute, Link } from "@tanstack/react-router";
import { EditorWorkspace } from "@/components/cv/editor";
import { Button } from "@/components/ui/button";
import { useCv, useCvStore } from "@/lib/cv/store";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/editor/$cvId")({
  component: EditorPage,
});

function EditorPage() {
  const { cvId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const hydrated = useCvStore((s) => s.hydrated);
  const cv = useCv(cvId);

  if (isPending || !hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background text-muted">
        Opening draft…
      </main>
    );
  }

  if (!user) return <RedirectToSignIn to="/login" />;

  if (!cv) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-medium">This draft is gone</h1>
        <p className="max-w-sm text-sm text-muted">It may have been deleted, or it lives on another account.</p>
        <Button asChild>
          <Link to="/studio">Back to studio</Link>
        </Button>
      </main>
    );
  }

  return <EditorWorkspace cv={cv} />;
}
