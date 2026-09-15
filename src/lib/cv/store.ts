import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import type { CV, TemplateId } from "./types";
import { SAMPLE_CV as SAMPLE } from "./sample";
import { blankCv, normalizeCv } from "./normalize";

export { blankCv } from "./normalize";

function cloneSample(): CV {
  const raw = JSON.parse(JSON.stringify(SAMPLE)) as CV;
  raw.id = uid();
  raw.updatedAt = Date.now();
  return raw;
}

type CvState = {
  cvs: Record<string, CV>;
  order: string[];
  hydrated: boolean;
  setHydrated: () => void;
  replaceAll: (cvs: CV[]) => void;
  create: (seed?: "blank" | "sample", partial?: Partial<CV>) => CV;
  importCv: (cv: CV) => CV;
  update: (id: string, patch: (cv: CV) => CV) => void;
  patch: (id: string, partial: Partial<CV>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => CV | null;
  setTemplate: (id: string, template: TemplateId) => void;
};

export const useCvStore = create<CvState>()(
  persist(
    (set, get) => ({
      cvs: {},
      order: [],
      hydrated: false,
      setHydrated: () => {
        if (get().hydrated) return;
        set({ hydrated: true });
      },
      replaceAll: (list) => {
        const cvs: Record<string, CV> = {};
        const order: string[] = [];
        for (const item of list) {
          const cv = normalizeCv(item);
          if (!cv) continue;
          cvs[cv.id] = cv;
          order.push(cv.id);
        }
        set({ cvs, order });
      },
      create: (seed = "blank", partial) => {
        const cv = seed === "sample" ? cloneSample() : blankCv(partial);
        set((s) => ({
          cvs: { ...s.cvs, [cv.id]: cv },
          order: [cv.id, ...s.order.filter((id) => id !== cv.id)],
        }));
        return cv;
      },
      importCv: (incoming) => {
        const parsed = normalizeCv(incoming) ?? blankCv();
        const cv: CV = { ...parsed, id: uid(), updatedAt: Date.now() };
        set((s) => ({
          cvs: { ...s.cvs, [cv.id]: cv },
          order: [cv.id, ...s.order],
        }));
        return cv;
      },
      update: (id, patch) => {
        const current = get().cvs[id];
        if (!current) return;
        const next = { ...patch(current), id, updatedAt: Date.now() };
        set((s) => ({ cvs: { ...s.cvs, [id]: next } }));
      },
      patch: (id, partial) => {
        const current = get().cvs[id];
        if (!current) return;
        set((s) => ({
          cvs: {
            ...s.cvs,
            [id]: { ...current, ...partial, id, updatedAt: Date.now() },
          },
        }));
      },
      remove: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.cvs;
          return { cvs: rest, order: s.order.filter((x) => x !== id) };
        });
      },
      duplicate: (id) => {
        const current = get().cvs[id];
        if (!current) return null;
        const copy: CV = {
          ...(JSON.parse(JSON.stringify(current)) as CV),
          id: uid(),
          name: `${current.name} copy`,
          updatedAt: Date.now(),
        };
        set((s) => ({
          cvs: { ...s.cvs, [copy.id]: copy },
          order: [copy.id, ...s.order],
        }));
        return copy;
      },
      setTemplate: (id, template) => {
        const current = get().cvs[id];
        if (!current) return;
        set((s) => ({
          cvs: {
            ...s.cvs,
            [id]: { ...current, template, updatedAt: Date.now() },
          },
        }));
      },
    }),
    {
      name: "kwetu-cvs-v1",
      partialize: (s) => ({ cvs: s.cvs, order: s.order }),
      skipHydration: true,
    },
  ),
);

export function useCv(id: string | undefined) {
  return useCvStore((s) => (id ? s.cvs[id] : undefined));
}
