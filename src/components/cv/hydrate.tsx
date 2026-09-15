import { useEffect, useRef } from "react";
import { useCvStore } from "@/lib/cv/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listDocuments, saveDocument } from "@/lib/data/documents";

export function CvHydration() {
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    const done = () => useCvStore.getState().setHydrated();
    const unsub = useCvStore.persist.onFinishHydration(done);
    void useCvStore.persist.rehydrate();
    if (useCvStore.persist.hasHydrated()) done();
    return unsub;
  }, []);

  useEffect(() => {
    if (isPending || !userId) return;
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    void listDocuments()
      .then((rows) => {
        if (rows.length) useCvStore.getState().replaceAll(rows);
      })
      .catch(() => {
        /* keep local drafts if the account fetch fails */
      });
  }, [isPending, userId]);

  return null;
}

export function useCvAutosave(id: string | undefined) {
  const cv = useCvStore((s) => (id ? s.cvs[id] : undefined));
  const { user } = useCurrentUserState();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!cv || !user) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void saveDocument({ data: cv }).catch(() => {
        /* next edit retries */
      });
    }, 700);
    return () => window.clearTimeout(timer.current);
  }, [cv, user]);
}
