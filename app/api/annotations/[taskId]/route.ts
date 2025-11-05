import { NextResponse } from "next/server";
import { getLatestAnnotation, saveAnnotation, saveAnnotationDraft, submitAnnotation } from "@/server/repositories/annotations";

export async function GET(_req: Request, ctx: { params: { taskId: string } }) {
  const ann = await getLatestAnnotation(ctx.params.taskId);
  return NextResponse.json(ann ?? null);
}

export async function POST(req: Request, ctx: { params: { taskId: string } }) {
  try {
    const taskId = ctx.params.taskId;
    const body = await req.json();
    const { userId, type, payload, mode } = body as { userId?: string; type?: string; payload?: unknown; mode?: "draft" | "save" | "submit" };
    if (!userId || !type || payload === undefined) return NextResponse.json({ error: "missing fields" }, { status: 400 });
    let result;
    if (mode === "submit") result = await submitAnnotation({ taskId, userId, type, payload: payload as any });
    else if (mode === "save") result = await saveAnnotation({ taskId, userId, type, payload: payload as any });
    else result = await saveAnnotationDraft({ taskId, userId, type, payload: payload as any });
    return NextResponse.json({ ok: true, id: result.id, version: result.version, status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 400 });
  }
}

