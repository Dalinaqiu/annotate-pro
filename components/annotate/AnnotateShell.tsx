"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "image" | "text";
type Tool = "select" | "rect" | "polygon" | "brush" | "eraser";

export type AnnotateShellProps = {
  taskId: string;
  userId?: string | null;
  sourceUri?: string | null;
  mimeType?: string | null;
};

type Rect = { id: string; x: number; y: number; w: number; h: number; label?: string; confidence?: number };
type Polygon = { id: string; points: Array<{ x: number; y: number }>; label?: string; confidence?: number };
type NerEntity = { id: string; start: number; end: number; label: string };

export function AnnotateShell({ taskId, userId, sourceUri, mimeType }: AnnotateShellProps) {
  const mode: Mode = mimeType?.startsWith("image/") ? "image" : mimeType?.startsWith("text/") ? "text" : "image";
  const [tool, setTool] = useState<Tool>("select");
  const [autosave, setAutosave] = useState(true);
  const [offline, setOffline] = useState(!globalThis?.navigator?.onLine);
  const [rightOpen, setRightOpen] = useState<boolean>(() => {
    try { const raw = localStorage.getItem(`ap:${taskId}:rightOpen`); return raw ? JSON.parse(raw) : true; } catch { return true; }
  });
  const [aiOpen, setAiOpen] = useState(false);

  // Image data
  const [rects, setRects] = useState<Rect[]>(() => loadLocal(taskId, "rects", []));
  const [polys, setPolys] = useState<Polygon[]>(() => loadLocal(taskId, "polys", []));
  const [confidence, setConfidence] = useState<number>(() => loadLocal(taskId, "confidence", 0.9));
  const canvasRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Text data
  const [textContent, setTextContent] = useState<string>("");
  const [entities, setEntities] = useState<NerEntity[]>(() => loadLocal(taskId, "entities", []));

  // Load latest annotation from server on mount
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/annotations/${taskId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (ignore || !data) return;
        if (data.type?.startsWith("image")) {
          const p = data.payload ?? {};
          setRects(p.rects ?? []);
          setPolys(p.polys ?? []);
          setConfidence(p.confidence ?? 0.9);
        } else if (data.type?.startsWith("text")) {
          const p = data.payload ?? {};
          setEntities(p.entities ?? []);
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [taskId]);

  // Offline detection
  useEffect(() => {
    const h1 = () => setOffline(false);
    const h2 = () => setOffline(true);
    window.addEventListener("online", h1);
    window.addEventListener("offline", h2);
    return () => {
      window.removeEventListener("online", h1);
      window.removeEventListener("offline", h2);
    };
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!autosave) return;
    if (mode === "image") saveLocal(taskId, "rects", rects);
  }, [autosave, mode, rects, taskId]);
  useEffect(() => {
    if (!autosave) return;
    if (mode === "image") saveLocal(taskId, "polys", polys);
  }, [autosave, mode, polys, taskId]);
  useEffect(() => {
    if (!autosave) return;
    if (mode === "image") saveLocal(taskId, "confidence", confidence);
  }, [autosave, mode, confidence, taskId]);
  useEffect(() => {
    if (!autosave) return;
    if (mode === "text") saveLocal(taskId, "entities", entities);
  }, [autosave, mode, entities, taskId]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "r") setTool("rect");
      if (e.key === "p") setTool("polygon");
      if (e.key === "s") setTool("select");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSave("save");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (tool !== "rect") return;
    const { x, y } = relative(e, canvasRef.current);
    startRef.current = { x, y };
  }
  function onCanvasMouseUp(e: React.MouseEvent) {
    if (tool !== "rect") return;
    const st = startRef.current; if (!st) return;
    const { x, y } = relative(e, canvasRef.current);
    const w = Math.abs(x - st.x); const h = Math.abs(y - st.y);
    const rx = Math.min(x, st.x); const ry = Math.min(y, st.y);
    setRects((rs) => [{ id: crypto.randomUUID(), x: rx, y: ry, w, h, confidence }, ...rs]);
    startRef.current = null;
  }

  async function doSave(mode: "draft" | "save" | "submit") {
    if (!userId) return alert("未登录，无法保存");
    const isImage = (mimeType ?? "").startsWith("image/");
    const type = isImage ? "image.basic" : "text.ner";
    const p: any = isImage ? { rects, polys, confidence } : { entities };
    const res = await fetch(`/api/annotations/${taskId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, type, payload: p, mode }) });
    if (!res.ok) {
      alert("保存失败"); return;
    }
    if (mode === "submit") alert("已提交，等待审核");
  }

  function onTextMouseUp() {
    if (tool !== "select") return;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const container = document.getElementById("ap-text");
    if (!container || !container.contains(range.commonAncestorContainer)) return;
    const start = getTextOffset(container, range.startContainer, range.startOffset);
    const end = getTextOffset(container, range.endContainer, range.endOffset);
    const label = prompt("标签名？", "ENTITY");
    if (!label) return;
    setEntities((es) => [{ id: crypto.randomUUID(), start, end, label }, ...es]);
    sel.removeAllRanges();
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left toolbar */}
      <aside className="w-44 border-r p-2 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">工具栏</div>
        <div className="flex flex-wrap gap-2">
          <button className={btn(tool === "select")} onClick={() => setTool("select")}>选择 (S)</button>
          {mode === "image" && <button className={btn(tool === "rect")} onClick={() => setTool("rect")}>矩形 (R)</button>}
          {mode === "image" && <button className={btn(tool === "polygon")} onClick={() => setTool("polygon")}>多边形 (P)</button>}
          {mode === "image" && <button className={btn(false)} title="占位">分割刷</button>}
          {mode === "image" && <button className={btn(false)} title="占位">橡皮擦</button>}
        </div>
        <div className="pt-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} /> 自动保存
          </label>
        </div>
        <div className="pt-2 text-xs">{offline ? "离线模式" : "在线"}</div>
        <div className="pt-2">
          <button className={btn(false)} onClick={() => setAiOpen((v) => !v)}>AI 助手</button>
        </div>
      </aside>

      {/* Center canvas / text */}
      <section className="flex-1 relative">
        {mode === "image" ? (
          <div ref={canvasRef} className="h-full w-full bg-neutral-50 relative" onMouseDown={onCanvasMouseDown} onMouseUp={onCanvasMouseUp}>
            {sourceUri ? <img src={sourceUri} alt="source" className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none" /> : <div className="p-4 text-sm text-muted-foreground">No image</div>}
            {/* Rect overlays */}
            {rects.map((r) => (
              <div key={r.id} className="absolute border-2 border-emerald-500/80 bg-emerald-500/10" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
            ))}
          </div>
        ) : (
          <div className="h-full w-full overflow-auto p-4" onMouseUp={onTextMouseUp}>
            <div id="ap-text" className="prose max-w-none whitespace-pre-wrap">
              {renderTextWithEntities(textContent, entities)}
            </div>
          </div>
        )}
      </section>

      {/* Right panel */}
      {rightOpen && (
        <aside className="w-72 border-l p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">属性</div>
            <button className="text-xs underline" onClick={() => { setRightOpen(false); try { localStorage.setItem(`ap:${taskId}:rightOpen`, JSON.stringify(false)); } catch {} }}>收起</button>
          </div>
          {mode === "image" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">置信度</label>
                <input type="range" min={0} max={1} step={0.01} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full" />
                <div className="text-xs">{confidence.toFixed(2)}</div>
              </div>
              <div className="text-xs text-muted-foreground">共 {rects.length} 个矩形</div>
            </div>
          )}
          {mode === "text" && (
            <div className="space-y-2 text-sm">
              <textarea className="w-full h-40 border rounded p-2" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="粘贴文本..." />
              <div className="text-xs text-muted-foreground">标注实体：{entities.length}</div>
              <div className="space-y-1">
                {entities.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                    <div>
                      <span className="font-mono">[{e.start},{e.end})</span> {e.label}
                    </div>
                    <button className="underline" onClick={() => setEntities((arr) => arr.filter((x) => x.id !== e.id))}>删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
      {!rightOpen && (
        <button className="absolute right-0 top-12 z-10 rounded-l border bg-white px-2 py-1 text-xs" onClick={() => { setRightOpen(true); try { localStorage.setItem(`ap:${taskId}:rightOpen`, JSON.stringify(true)); } catch {} }}>展开属性</button>
      )}

      {/* AI Assistant */}
      {aiOpen && (
        <div className="absolute right-2 bottom-2 z-10 w-80 rounded border bg-white p-3 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">AI 助手（占位）</div>
            <button className="text-xs" onClick={() => setAiOpen(false)}>×</button>
          </div>
          <div className="text-xs text-muted-foreground">此处集成预标注、建议与批量修正。</div>
          <button className={btn(false)} onClick={() => alert("调用模型推理（占位）")}>运行预标注</button>
        </div>
      )}

      {/* Top save bar (fixed) */}
      <div className="fixed left-0 right-0 top-0 z-20 flex items-center gap-2 border-b bg-white/90 p-2 backdrop-blur">
        <div className="px-2 text-sm">任务 {taskId}</div>
        <div className="flex-1" />
        <button className={btn(false)} onClick={() => doSave("draft")}>本地草稿</button>
        <button className={btn(false)} onClick={() => doSave("save")}>保存 (Ctrl/Cmd+S)</button>
        <button className={btn(false)} onClick={() => doSave("submit")}>提交审核</button>
      </div>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded border px-2 py-1 text-xs ${active ? "bg-black text-white" : "bg-white"}`;
}

function saveLocal(taskId: string, key: string, value: unknown) {
  try { localStorage.setItem(`ap:${taskId}:${key}`, JSON.stringify(value)); } catch {}
}
function loadLocal<T>(taskId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`ap:${taskId}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function relative(e: React.MouseEvent, el: HTMLDivElement | null) {
  const r = el?.getBoundingClientRect();
  const x = e.clientX - (r?.left ?? 0);
  const y = e.clientY - (r?.top ?? 0);
  return { x, y };
}

function getTextOffset(root: HTMLElement, node: Node, offset: number): number {
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n === node) return count + offset;
    count += n.data.length;
  }
  return count;
}

function renderTextWithEntities(text: string, entities: { start: number; end: number; label: string; id: string }[]) {
  if (!text) return <span className="text-muted-foreground">在此粘贴文本…</span>;
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let idx = 0;
  for (const e of sorted) {
    if (e.start > idx) parts.push(text.slice(idx, e.start));
    const chunk = text.slice(e.start, e.end);
    parts.push(
      <mark key={e.id} className="rounded bg-amber-200 px-0.5">
        <span title={`${e.label} [${e.start},${e.end})`}>{chunk}</span>
      </mark>
    );
    idx = e.end;
  }
  if (idx < text.length) parts.push(text.slice(idx));
  return parts;
}
