import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { normalizeCv } from "@/lib/cv/normalize";
import type { CV } from "@/lib/cv/types";
import { getEntitlements } from "./billing";

function rowToCv(row: { id: string; payload: string; name: string; updated_at: number | string }): CV | null {
  try {
    const parsed = JSON.parse(row.payload) as unknown;
    const cv = normalizeCv(parsed);
    if (!cv) return null;
    cv.id = row.id;
    cv.name = row.name || cv.name;
    cv.updatedAt = Number(row.updated_at) || cv.updatedAt;
    return cv;
  } catch {
    return null;
  }
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      payload: string;
      updated_at: number | string;
    }>`select id, name, payload, updated_at from cv_documents where user_id = ${context.userId} order by updated_at desc`;
    return rows.map(rowToCv).filter((c): c is CV => Boolean(c));
  });

export const saveDocument = createServerFn({ method: "POST" })
  .validator((input: CV) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const cv = normalizeCv(data);
    if (!cv) return { ok: false as const, error: "Invalid CV" };
    const sql = await getSql();
    const existing = await sql<{ id: string }>`select id from cv_documents where id = ${cv.id} and user_id = ${context.userId}`;
    if (existing.length === 0) {
      const ents = await getEntitlements(context.userId);
      const countRows = await sql<{ n: number | string }>`select count(*) as n from cv_documents where user_id = ${context.userId}`;
      const count = Number(countRows[0]?.n ?? 0);
      if (count >= ents.maxCvs) {
        return {
          ok: false as const,
          error: `Starter keeps ${ents.maxCvs} CVs. Upgrade to save more.`,
          code: "upgrade" as const,
        };
      }
      await sql`insert into cv_documents (id, user_id, name, payload, updated_at, created_at) values (${cv.id}, ${context.userId}, ${cv.name}, ${JSON.stringify(cv)}, ${cv.updatedAt}, ${cv.updatedAt})`;
    } else {
      await sql`update cv_documents set name = ${cv.name}, payload = ${JSON.stringify(cv)}, updated_at = ${cv.updatedAt} where id = ${cv.id} and user_id = ${context.userId}`;
    }
    return { ok: true as const };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from cv_documents where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
