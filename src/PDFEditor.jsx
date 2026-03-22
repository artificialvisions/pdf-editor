import { useState, useRef, useEffect, useCallback } from "react";

const PDF_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
const PDFLIB_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initPdfJs() {
  await loadScript(`${PDF_JS_CDN}/pdf.min.js`);
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDF_JS_CDN}/pdf.worker.min.js`;
  return pdfjsLib;
}

async function ensurePdfLib() {
  if (!window.PDFLib) await loadScript(PDFLIB_CDN);
  return window.PDFLib;
}

/* ═══════════ CONSTANTS ═══════════ */
const FONTS = [
  { label: "Sans Serif", value: "Helvetica, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "'Courier New', Courier, monospace" },
];
const COLORS = [
  { label: "Nero", hex: "#000000" }, { label: "Rosso", hex: "#C0392B" },
  { label: "Blu", hex: "#2980B9" }, { label: "Verde", hex: "#27AE60" },
  { label: "Grigio", hex: "#7F8C8D" }, { label: "Bianco", hex: "#FFFFFF" },
];
const TOOLS = { SELECT: "select", TEXT: "text", WHITEOUT: "whiteout", IMAGE: "image" };
const mono = "'JetBrains Mono', monospace";

/* ═══════════ SHARED STYLES ═══════════ */
const pill = (on) => ({
  padding: "7px 14px", borderRadius: 6, border: "none", fontSize: 12,
  fontFamily: mono, letterSpacing: 0.5, cursor: "pointer", fontWeight: 600,
  background: on ? "rgba(231,76,60,0.22)" : "rgba(255,255,255,0.07)",
  color: on ? "#E74C3C" : "#c0c8d0",
  outline: on ? "1.5px solid rgba(231,76,60,0.4)" : "1.5px solid transparent",
  transition: "all 0.15s",
});
const lbl = { fontSize: 9, color: "#6b7d8d", fontFamily: mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 };
const inp = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "#ecf0f1", padding: "5px 8px", fontSize: 13, outline: "none", fontFamily: "inherit" };
const btnAction = {
  background: "linear-gradient(135deg, #E74C3C, #C0392B)", color: "#fff",
  border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12,
  fontWeight: 600, cursor: "pointer", fontFamily: mono, letterSpacing: 0.5,
};

/* ═══════════════════════════════════════════
   Text Overlay
   ═══════════════════════════════════════════ */
function TextOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(item._new || false);
  const dragOff = useRef({ x: 0, y: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); if (item._new) onUpdate({ ...item, _new: false }); }
  }, [editing]);

  const onMD = (e) => {
    if (editing) return; e.stopPropagation(); onSelect(); setDragging(true);
    const r = e.currentTarget.getBoundingClientRect(); dragOff.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useEffect(() => {
    if (!dragging) return;
    const mv = (e) => { if (!containerRef.current) return; const c = containerRef.current.getBoundingClientRect(); onUpdate({ ...item, x: Math.max(0, (e.clientX - c.left - dragOff.current.x) / scale), y: Math.max(0, (e.clientY - c.top - dragOff.current.y) / scale) }); };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [dragging, scale, item]);

  return (
    <div style={{ position: "absolute", left: item.x * scale, top: item.y * scale, fontSize: item.fontSize * scale, fontFamily: item.fontFamily, color: item.color, cursor: dragging ? "grabbing" : editing ? "text" : "grab", border: selected ? "2px dashed #E74C3C" : "2px dashed transparent", borderRadius: 3, padding: "2px 4px", background: selected ? "rgba(231,76,60,0.07)" : "transparent", userSelect: editing ? "text" : "none", whiteSpace: "pre-wrap", minWidth: 24 * scale, minHeight: item.fontSize * scale * 1.2, lineHeight: 1.35, zIndex: selected ? 20 : 10, fontWeight: item.bold ? "bold" : "normal", fontStyle: item.italic ? "italic" : "normal" }}
      onMouseDown={onMD} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); onSelect(); }} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {editing ? <textarea ref={inputRef} value={item.text} onChange={(e) => onUpdate({ ...item, text: e.target.value })} onBlur={() => setEditing(false)} onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
        style={{ font: "inherit", color: "inherit", background: "rgba(255,255,255,0.92)", border: "none", outline: "none", resize: "both", minWidth: 80, minHeight: item.fontSize * scale * 1.2, padding: 2, margin: 0, lineHeight: "inherit", fontWeight: "inherit", fontStyle: "inherit" }} />
        : <span>{item.text || " "}</span>}
      {selected && !editing && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: -12, right: -12, width: 22, height: 22, borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>×</button>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Whiteout Overlay
   ═══════════════════════════════════════════ */
function WhiteoutOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [mode, setMode] = useState(null);
  const start = useRef({});
  const onMD = (e, type) => { e.stopPropagation(); onSelect(); setMode(type); start.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h }; };
  useEffect(() => {
    if (!mode) return;
    const mv = (e) => { const dx = (e.clientX - start.current.mx) / scale; const dy = (e.clientY - start.current.my) / scale; if (mode === "drag") onUpdate({ ...item, x: Math.max(0, start.current.x + dx), y: Math.max(0, start.current.y + dy) }); else onUpdate({ ...item, w: Math.max(20, start.current.w + dx), h: Math.max(10, start.current.h + dy) }); };
    const up = () => setMode(null); window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [mode, scale, item]);
  return (
    <div onMouseDown={(e) => onMD(e, "drag")} onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ position: "absolute", left: item.x * scale, top: item.y * scale, width: item.w * scale, height: item.h * scale, background: item.fillColor || "#FFFFFF", border: selected ? "2px dashed #E74C3C" : "1px solid rgba(0,0,0,0.06)", borderRadius: 2, cursor: "move", zIndex: 8, boxSizing: "border-box" }}>
      <div onMouseDown={(e) => onMD(e, "resize")} style={{ position: "absolute", bottom: -4, right: -4, width: 10, height: 10, background: selected ? "#E74C3C" : "transparent", borderRadius: 2, cursor: "nwse-resize" }} />
      {selected && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: -12, right: -12, width: 22, height: 22, borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>×</button>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Image Overlay
   ═══════════════════════════════════════════ */
function ImageOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [mode, setMode] = useState(null);
  const start = useRef({});
  const onMD = (e, type) => { e.stopPropagation(); onSelect(); setMode(type); start.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h }; };
  useEffect(() => {
    if (!mode) return;
    const mv = (e) => {
      const dx = (e.clientX - start.current.mx) / scale; const dy = (e.clientY - start.current.my) / scale;
      if (mode === "drag") onUpdate({ ...item, x: Math.max(0, start.current.x + dx), y: Math.max(0, start.current.y + dy) });
      else { const aspect = start.current.w / start.current.h; if (e.shiftKey) onUpdate({ ...item, w: Math.max(20, start.current.w + dx), h: Math.max(20, start.current.h + dy) }); else { const nw = Math.max(20, start.current.w + dx); onUpdate({ ...item, w: nw, h: nw / aspect }); } }
    };
    const up = () => setMode(null); window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [mode, scale, item]);
  return (
    <div onMouseDown={(e) => onMD(e, "drag")} onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ position: "absolute", left: item.x * scale, top: item.y * scale, width: item.w * scale, height: item.h * scale, border: selected ? "2px dashed #E74C3C" : "2px dashed transparent", borderRadius: 3, cursor: "move", zIndex: selected ? 18 : 9, boxSizing: "border-box", overflow: "hidden" }}>
      <img src={item.dataUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }} />
      <div onMouseDown={(e) => onMD(e, "resize")} style={{ position: "absolute", bottom: -4, right: -4, width: 12, height: 12, background: selected ? "#E74C3C" : "rgba(0,0,0,0.15)", borderRadius: 2, cursor: "nwse-resize", border: "1px solid rgba(255,255,255,0.5)" }} />
      {selected && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: -12, right: -12, width: 22, height: 22, borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>×</button>}
      {selected && <div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "2px 5px", borderRadius: 3, fontFamily: mono, pointerEvents: "none" }}>{Math.round(item.w)}×{Math.round(item.h)}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page View (single page canvas + overlays)
   ═══════════════════════════════════════════ */
function PageView({ pageNum, pdfDoc, pageOrder, overlays, scale, selectedId, activeTool, onSelect, onUpdate, onDelete, onAddText, onAddWhiteout }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const drawStart = useRef(null);
  const [tempRect, setTempRect] = useState(null);

  // pageOrder maps display index → actual page number (1-based) or "blank"
  const actualPage = pageOrder[pageNum - 1];
  const isBlank = actualPage === "blank";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (isBlank) {
        // A4 proportions at scale
        const w = 595 * scale; const h = 842 * scale;
        canvas.width = w; canvas.height = h; setDims({ w, h });
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      } else {
        const page = await pdfDoc.getPage(actualPage);
        const vp = page.getViewport({ scale });
        canvas.width = vp.width; canvas.height = vp.height; setDims({ w: vp.width, h: vp.height });
        if (!cancelled) await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, actualPage, scale, isBlank]);

  const pos = (e) => { const r = containerRef.current.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
  const onMD = (e) => { if (activeTool === TOOLS.WHITEOUT) { drawStart.current = pos(e); setTempRect({ ...pos(e), w: 0, h: 0 }); } };
  const onMM = (e) => { if (activeTool === TOOLS.WHITEOUT && drawStart.current) { const p = pos(e); setTempRect({ x: Math.min(drawStart.current.x, p.x), y: Math.min(drawStart.current.y, p.y), w: Math.abs(p.x - drawStart.current.x), h: Math.abs(p.y - drawStart.current.y) }); } };
  const onMU = () => { if (activeTool === TOOLS.WHITEOUT && tempRect && tempRect.w > 5 && tempRect.h > 5) onAddWhiteout(pageNum, tempRect.x, tempRect.y, tempRect.w, tempRect.h); drawStart.current = null; setTempRect(null); };
  const onClick = (e) => { if (activeTool === TOOLS.TEXT) onAddText(pageNum, pos(e).x, pos(e).y); else onSelect(null); };
  const onDbl = (e) => { if (activeTool === TOOLS.SELECT) onAddText(pageNum, pos(e).x, pos(e).y); };

  return (
    <div style={{ position: "relative", width: dims.w || "100%", height: dims.h || 400, boxShadow: "0 6px 32px rgba(0,0,0,0.25)", borderRadius: 6, overflow: "hidden", background: "#fff", cursor: activeTool === TOOLS.WHITEOUT ? "crosshair" : activeTool === TOOLS.TEXT ? "text" : activeTool === TOOLS.IMAGE ? "copy" : "default" }}
      ref={containerRef} onClick={onClick} onDoubleClick={onDbl} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {overlays.filter((o) => o.page === pageNum && o.type === "whiteout").map((o) => <WhiteoutOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />)}
      {overlays.filter((o) => o.page === pageNum && o.type === "image").map((o) => <ImageOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />)}
      {overlays.filter((o) => o.page === pageNum && o.type === "text").map((o) => <TextOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />)}
      {tempRect && <div style={{ position: "absolute", left: tempRect.x * scale, top: tempRect.y * scale, width: tempRect.w * scale, height: tempRect.h * scale, background: "rgba(255,255,255,0.85)", border: "2px dashed #E74C3C", borderRadius: 2, pointerEvents: "none", zIndex: 30 }} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE THUMBNAIL for page manager sidebar
   ═══════════════════════════════════════════ */
function PageThumb({ index, total, actualPage, pdfDoc, onMoveUp, onMoveDown, onDelete, onAddBlank, isBlank }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let c = false;
    (async () => {
      const canvas = canvasRef.current;
      if (isBlank) { canvas.width = 120; canvas.height = 170; const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 120, 170); ctx.strokeStyle = "#ddd"; ctx.strokeRect(0, 0, 120, 170); ctx.fillStyle = "#ccc"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Pagina vuota", 60, 90); }
      else if (pdfDoc) { const page = await pdfDoc.getPage(actualPage); const vp = page.getViewport({ scale: 0.2 }); canvas.width = vp.width; canvas.height = vp.height; if (!c) await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise; }
    })();
    return () => { c = true; };
  }, [pdfDoc, actualPage, isBlank]);

  const btnSt = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c0c8d0", cursor: "pointer", padding: "2px 6px", fontSize: 11, fontFamily: mono };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 10, color: "#8395a7", fontFamily: mono }}>{index + 1}/{total}</div>
      <canvas ref={canvasRef} style={{ borderRadius: 3, maxWidth: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onMoveUp} disabled={index === 0} style={{ ...btnSt, opacity: index === 0 ? 0.3 : 1 }} title="Sposta su">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={{ ...btnSt, opacity: index === total - 1 ? 0.3 : 1 }} title="Sposta giù">↓</button>
        <button onClick={onDelete} style={{ ...btnSt, color: "#E74C3C" }} title="Elimina pagina">✕</button>
        <button onClick={onAddBlank} style={{ ...btnSt, color: "#27AE60" }} title="Inserisci pagina vuota dopo">+</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDITOR MODE
   ═══════════════════════════════════════════ */
function EditorMode() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pageOrder, setPageOrder] = useState([]); // array of page numbers (1-based) or "blank"
  const [overlays, setOverlays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(1.3);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [showPages, setShowPages] = useState(false);
  const idC = useRef(0);
  const fileRef = useRef(null);
  const imgRef = useRef(null);

  const [defFont, setDefFont] = useState(FONTS[0].value);
  const [defSize, setDefSize] = useState(14);
  const [defColor, setDefColor] = useState("#000000");
  const [defBold, setDefBold] = useState(false);
  const [defItalic, setDefItalic] = useState(false);

  const sel = overlays.find((o) => o.id === selectedId);
  const numPages = pageOrder.length;

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") { setError("Seleziona un PDF valido."); return; }
    setError(""); setLoading(true);
    try {
      const lib = await initPdfJs();
      const buf = await file.arrayBuffer();
      setPdfBytes(new Uint8Array(buf));
      const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
      setPdfDoc(doc); setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i + 1));
      setFileName(file.name); setOverlays([]); setSelectedId(null);
    } catch (e) { setError("Errore: " + e.message); }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }, [handleFile]);

  // Page management
  const movePage = (idx, dir) => {
    const newOrder = [...pageOrder]; const [item] = newOrder.splice(idx, 1); newOrder.splice(idx + dir, 0, item);
    // Remap overlays
    const oldToNew = {}; pageOrder.forEach((_, i) => { const newIdx = newOrder.indexOf(pageOrder[i]); /* keep as display page index */ });
    setPageOrder(newOrder);
    // Remap overlay page numbers
    const mapping = {};
    pageOrder.forEach((val, oldIdx) => { const newIdx = newOrder.indexOf(val); mapping[oldIdx + 1] = newIdx + 1; });
    // But since we just swapped two, simpler:
    const a = idx + 1; const b = idx + dir + 1;
    setOverlays(prev => prev.map(o => o.page === a ? { ...o, page: b } : o.page === b ? { ...o, page: a } : o));
  };

  const deletePage = (idx) => {
    if (pageOrder.length <= 1) return;
    const removed = idx + 1;
    setPageOrder(prev => prev.filter((_, i) => i !== idx));
    setOverlays(prev => prev.filter(o => o.page !== removed).map(o => o.page > removed ? { ...o, page: o.page - 1 } : o));
  };

  const addBlankAfter = (idx) => {
    const newOrder = [...pageOrder]; newOrder.splice(idx + 1, 0, "blank");
    const insertAt = idx + 2;
    setOverlays(prev => prev.map(o => o.page >= insertAt ? { ...o, page: o.page + 1 } : o));
    setPageOrder(newOrder);
  };

  const addText = (page, x, y) => {
    const id = ++idC.current;
    setOverlays(p => [...p, { id, type: "text", page, x, y, text: "Testo", fontSize: defSize, fontFamily: defFont, color: defColor, bold: defBold, italic: defItalic, _new: true }]);
    setSelectedId(id); if (activeTool === TOOLS.TEXT) setActiveTool(TOOLS.SELECT);
  };
  const addWhiteout = (page, x, y, w, h) => { const id = ++idC.current; setOverlays(p => [...p, { id, type: "whiteout", page, x, y, w, h, fillColor: "#FFFFFF" }]); setSelectedId(id); };

  const handleImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const img = new Image(); img.onload = () => {
      const maxW = 300; let w = img.naturalWidth; let h = img.naturalHeight; if (w > maxW) { const r = maxW / w; w = maxW; h *= r; }
      const id = ++idC.current;
      setOverlays(p => [...p, { id, type: "image", page: 1, x: 50, y: 50, w, h, dataUrl: ev.target.result, naturalW: img.naturalWidth, naturalH: img.naturalHeight }]);
      setSelectedId(id); setActiveTool(TOOLS.SELECT);
    }; img.src = ev.target.result; };
    reader.readAsDataURL(file);
  }, []);

  const updateOverlay = (u) => setOverlays(p => p.map(o => o.id === u.id ? u : o));
  const deleteOverlay = (id) => { setOverlays(p => p.filter(o => o.id !== id)); if (selectedId === id) setSelectedId(null); };
  const updateSel = (patch) => {
    if (!sel) return; updateOverlay({ ...sel, ...patch });
    if (sel.type === "text") { if (patch.fontSize !== undefined) setDefSize(patch.fontSize); if (patch.fontFamily !== undefined) setDefFont(patch.fontFamily); if (patch.color !== undefined) setDefColor(patch.color); if (patch.bold !== undefined) setDefBold(patch.bold); if (patch.italic !== undefined) setDefItalic(patch.italic); }
  };

  // Export
  const handleExport = async () => {
    if (!pdfDoc) return; setExporting(true);
    try {
      const rs = 2; const imgs = [];
      for (let p = 0; p < pageOrder.length; p++) {
        const actual = pageOrder[p]; const cv = document.createElement("canvas"); const ctx = cv.getContext("2d");
        if (actual === "blank") { cv.width = 595 * rs; cv.height = 842 * rs; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); }
        else { const page = await pdfDoc.getPage(actual); const vp = page.getViewport({ scale: rs }); cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: ctx, viewport: vp }).promise; }
        const displayPage = p + 1;
        overlays.filter(o => o.page === displayPage && o.type === "whiteout").forEach(o => { ctx.fillStyle = o.fillColor || "#FFF"; ctx.fillRect(o.x * rs, o.y * rs, o.w * rs, o.h * rs); });
        for (const o of overlays.filter(o => o.page === displayPage && o.type === "image")) { const img = new Image(); await new Promise(r => { img.onload = r; img.src = o.dataUrl; }); ctx.drawImage(img, o.x * rs, o.y * rs, o.w * rs, o.h * rs); }
        overlays.filter(o => o.page === displayPage && o.type === "text").forEach(o => { ctx.save(); ctx.font = `${o.italic ? "italic " : ""}${o.bold ? "bold " : ""}${o.fontSize * rs}px ${o.fontFamily}`; ctx.fillStyle = o.color; ctx.textBaseline = "top"; o.text.split("\n").forEach((l, i) => ctx.fillText(l, o.x * rs, o.y * rs + i * o.fontSize * rs * 1.35)); ctx.restore(); });
        imgs.push({ d: cv.toDataURL("image/jpeg", 0.93), w: cv.width / rs, h: cv.height / rs });
      }
      const { PDFDocument } = await ensurePdfLib();
      const pdf = await PDFDocument.create();
      for (const img of imgs) { const pg = pdf.addPage([img.w, img.h]); pg.drawImage(await pdf.embedJpg(await (await fetch(img.d)).arrayBuffer()), { x: 0, y: 0, width: img.w, height: img.h }); }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }));
      a.download = fileName.replace(/\.pdf$/i, "") + "_editato.pdf"; a.click();
    } catch (e) { setError("Errore export: " + e.message); }
    setExporting(false);
  };

  const isText = sel?.type === "text"; const isWO = sel?.type === "whiteout"; const isImg = sel?.type === "image";
  const showTextProps = isText || activeTool === TOOLS.TEXT || (!sel && activeTool === TOOLS.SELECT);
  const hints = {
    [TOOLS.SELECT]: "Doppio click → aggiungi testo · Click → seleziona · Trascina → sposta",
    [TOOLS.TEXT]: "Click sulla pagina per posizionare un nuovo blocco di testo",
    [TOOLS.WHITEOUT]: "Trascina per coprire il testo originale con un rettangolo",
    [TOOLS.IMAGE]: "Clicca '🖼 Immagine' per caricare un'immagine",
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = ""; }} />

      {/* Top bar */}
      <div style={{ padding: "10px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 10, color: "#8395a7", fontFamily: mono }}>{fileName || "Nessun file"} {numPages > 0 && `· ${numPages} pag.`}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pdfDoc && <>
            <button onClick={() => setShowPages(!showPages)} style={pill(showPages)}>📑 Pagine</button>
            <span style={{ fontSize: 10, color: "#6b7d8d", fontFamily: mono }}>ZOOM</span>
            <input type="range" min={0.5} max={2.5} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: 60, accentColor: "#E74C3C" }} />
            <span style={{ fontSize: 11, color: "#c0c8d0", fontFamily: mono }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => { setOverlays([]); setSelectedId(null); fileRef.current?.click(); }} style={{ ...pill(false), fontSize: 11 }}>Cambia PDF</button>
            <button onClick={handleExport} disabled={exporting} style={{ ...btnAction, opacity: exporting ? 0.6 : 1 }}>{exporting ? "Esporto..." : "⬇ Esporta PDF"}</button>
          </>}
        </div>
      </div>

      {error && <div style={{ margin: "0 28px 14px", background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 6, padding: "10px 16px", fontSize: 13, color: "#E74C3C" }}>{error}</div>}

      {!pdfDoc && !loading && (
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
          style={{ margin: "50px 28px", border: "2px dashed rgba(231,76,60,0.3)", borderRadius: 14, padding: "90px 40px", textAlign: "center", cursor: "pointer", background: "rgba(231,76,60,0.03)" }}>
          <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.5 }}>📄</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Trascina qui il tuo PDF</div>
          <div style={{ fontSize: 13, color: "#8395a7" }}>oppure clicca per selezionare</div>
        </div>
      )}
      {loading && <div style={{ textAlign: "center", padding: 80, color: "#8395a7" }}>Caricamento...</div>}

      {pdfDoc && !loading && <>
        {/* Sticky toolbar */}
        <div style={{ position: "sticky", top: 52, zIndex: 90, padding: "0 0", marginBottom: 12 }}>
          <div style={{ background: "rgba(15,12,41,0.95)", backdropFilter: "blur(14px)", padding: "10px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
            <div>
              <div style={lbl}>Strumento</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={pill(activeTool === TOOLS.SELECT)} onClick={() => setActiveTool(TOOLS.SELECT)}>↖ Seleziona</button>
                <button style={pill(activeTool === TOOLS.TEXT)} onClick={() => setActiveTool(TOOLS.TEXT)}>T Testo</button>
                <button style={pill(activeTool === TOOLS.WHITEOUT)} onClick={() => setActiveTool(TOOLS.WHITEOUT)}>▭ Copri</button>
                <button style={pill(activeTool === TOOLS.IMAGE)} onClick={() => { setActiveTool(TOOLS.IMAGE); imgRef.current?.click(); }}>🖼 Immagine</button>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
            {showTextProps && <>
              <div><div style={lbl}>Font</div><select value={isText ? sel.fontFamily : defFont} onChange={(e) => isText ? updateSel({ fontFamily: e.target.value }) : setDefFont(e.target.value)} style={{ ...inp, width: 120 }}>{FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
              <div><div style={lbl}>Dimensione</div><div style={{ display: "flex", alignItems: "center", gap: 2 }}><button onClick={() => { const v = Math.max(6, (isText ? sel.fontSize : defSize) - 1); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...pill(false), padding: "5px 8px", fontSize: 16, lineHeight: 1 }}>−</button><input type="number" min={6} max={120} value={isText ? sel.fontSize : defSize} onChange={(e) => { const v = Number(e.target.value); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...inp, width: 48, textAlign: "center" }} /><button onClick={() => { const v = Math.min(120, (isText ? sel.fontSize : defSize) + 1); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...pill(false), padding: "5px 8px", fontSize: 16, lineHeight: 1 }}>+</button></div></div>
              <div><div style={lbl}>Colore</div><div style={{ display: "flex", gap: 3 }}>{COLORS.map(c => { const on = (isText ? sel.color : defColor) === c.hex; return <button key={c.hex} title={c.label} onClick={() => isText ? updateSel({ color: c.hex }) : setDefColor(c.hex)} style={{ width: 22, height: 22, borderRadius: "50%", padding: 0, background: c.hex, cursor: "pointer", border: on ? "2.5px solid #E74C3C" : "2px solid rgba(255,255,255,0.15)", boxShadow: on ? "0 0 0 2px rgba(231,76,60,0.3)" : "none" }} />; })}</div></div>
              <div><div style={lbl}>Stile</div><div style={{ display: "flex", gap: 3 }}><button onClick={() => isText ? updateSel({ bold: !sel.bold }) : setDefBold(!defBold)} style={{ ...pill(isText ? sel.bold : defBold), fontWeight: "bold", padding: "5px 10px" }}>B</button><button onClick={() => isText ? updateSel({ italic: !sel.italic }) : setDefItalic(!defItalic)} style={{ ...pill(isText ? sel.italic : defItalic), fontStyle: "italic", padding: "5px 10px" }}>I</button></div></div>
            </>}
            {isWO && <div><div style={lbl}>Colore copertura</div><div style={{ display: "flex", gap: 3 }}>{["#FFFFFF", "#F5F5F5", "#FFFDE7", "#E8EAF6"].map(c => <button key={c} onClick={() => updateSel({ fillColor: c })} style={{ width: 22, height: 22, borderRadius: "50%", padding: 0, background: c, cursor: "pointer", border: sel.fillColor === c ? "2.5px solid #E74C3C" : "2px solid rgba(255,255,255,0.15)" }} />)}</div></div>}
            {isImg && <button onClick={() => imgRef.current?.click()} style={{ ...pill(false), fontSize: 11 }}>+ Altra immagine</button>}
            {sel && numPages > 1 && <div><div style={lbl}>Pagina</div><select value={sel.page} onChange={(e) => updateSel({ page: Number(e.target.value) })} style={{ ...inp, width: 70 }}>{Array.from({ length: numPages }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}</select></div>}
            {sel && <><div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} /><button onClick={() => deleteOverlay(sel.id)} style={{ ...pill(false), color: "#E74C3C" }}>✕ Elimina</button></>}
          </div>
          <div style={{ fontSize: 11, color: "#8395a7", fontFamily: mono, padding: "6px 28px", background: "rgba(15,12,41,0.85)", borderBottom: "1px solid rgba(255,255,255,0.04)", letterSpacing: 0.3 }}>💡 {hints[activeTool]}</div>
        </div>

        <div style={{ display: "flex", gap: 20, padding: "0 28px" }}>
          {/* Page manager sidebar */}
          {showPages && (
            <div style={{ width: 130, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 4 }}>
              <div style={{ fontSize: 10, color: "#8395a7", fontFamily: mono, textTransform: "uppercase", letterSpacing: 1 }}>Gestione pagine</div>
              {pageOrder.map((actual, idx) => (
                <PageThumb key={`${idx}-${actual}`} index={idx} total={pageOrder.length} actualPage={actual} pdfDoc={pdfDoc} isBlank={actual === "blank"}
                  onMoveUp={() => movePage(idx, -1)} onMoveDown={() => movePage(idx, 1)} onDelete={() => deletePage(idx)} onAddBlank={() => addBlankAfter(idx)} />
              ))}
              <button onClick={() => setPageOrder(p => [...p, "blank"])} style={{ ...pill(false), fontSize: 10, textAlign: "center", padding: "8px" }}>+ Pagina vuota alla fine</button>
            </div>
          )}

          {/* Main pages */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {pageOrder.map((_, idx) => (
              <div key={`page-${idx}`} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#8395a7", marginBottom: 6, fontFamily: mono, letterSpacing: 1, textTransform: "uppercase" }}>
                  Pagina {idx + 1} {pageOrder[idx] === "blank" && <span style={{ color: "#576574" }}>(vuota)</span>}
                </div>
                <PageView pageNum={idx + 1} pdfDoc={pdfDoc} pageOrder={pageOrder} overlays={overlays} scale={scale} selectedId={selectedId} activeTool={activeTool} onSelect={setSelectedId} onUpdate={updateOverlay} onDelete={deleteOverlay} onAddText={addText} onAddWhiteout={addWhiteout} />
              </div>
            ))}
          </div>
        </div>
      </>}
    </>
  );
}

/* ═══════════════════════════════════════════
   MERGE MODE
   ═══════════════════════════════════════════ */
function MergeMode() {
  const [files, setFiles] = useState([]); // { id, name, bytes, numPages, doc }
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const idC = useRef(0);

  const addFiles = async (fileList) => {
    setError("");
    const lib = await initPdfJs();
    for (const file of fileList) {
      if (file.type !== "application/pdf") continue;
      try {
        const buf = await file.arrayBuffer();
        const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
        setFiles(prev => [...prev, { id: ++idC.current, name: file.name, bytes: new Uint8Array(buf), numPages: doc.numPages, doc }]);
      } catch (e) { setError(`Errore con ${file.name}: ${e.message}`); }
    }
  };

  const move = (idx, dir) => { const n = [...files]; const [item] = n.splice(idx, 1); n.splice(idx + dir, 0, item); setFiles(n); };
  const remove = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleMerge = async () => {
    if (files.length < 2) { setError("Aggiungi almeno 2 PDF."); return; }
    setMerging(true); setError("");
    try {
      const { PDFDocument } = await ensurePdfLib();
      const merged = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(f.bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([await merged.save()], { type: "application/pdf" }));
      a.download = "unione_pdf.pdf"; a.click();
    } catch (e) { setError("Errore: " + e.message); }
    setMerging(false);
  };

  const FileThumbnail = ({ file, index }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
      let c = false;
      (async () => { if (!file.doc) return; const page = await file.doc.getPage(1); const vp = page.getViewport({ scale: 0.25 }); const cv = canvasRef.current; cv.width = vp.width; cv.height = vp.height; if (!c) await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; })();
      return () => { c = true; };
    }, [file.doc]);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        <canvas ref={canvasRef} style={{ borderRadius: 3, maxWidth: 60, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{file.name}</div>
          <div style={{ fontSize: 11, color: "#8395a7", fontFamily: mono }}>{file.numPages} pagin{file.numPages === 1 ? "a" : "e"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <button onClick={() => move(index, -1)} disabled={index === 0} style={{ ...pill(false), padding: "4px 8px", fontSize: 13, opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={() => move(index, 1)} disabled={index === files.length - 1} style={{ ...pill(false), padding: "4px 8px", fontSize: 13, opacity: index === files.length - 1 ? 0.3 : 1 }}>↓</button>
        </div>
        <button onClick={() => remove(index)} style={{ ...pill(false), color: "#E74C3C", padding: "4px 10px" }}>✕</button>
      </div>
    );
  };

  return (
    <div style={{ padding: "30px 28px", maxWidth: 700, margin: "0 auto" }}>
      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />

      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Unisci PDF</div>
        <div style={{ fontSize: 13, color: "#8395a7" }}>Carica più PDF, riordinali e scarica il file unito</div>
      </div>

      {error && <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 6, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#E74C3C" }}>{error}</div>}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: "2px dashed rgba(231,76,60,0.3)", borderRadius: 12, padding: "40px", textAlign: "center", cursor: "pointer", background: "rgba(231,76,60,0.03)", marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📁</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Trascina qui i PDF da unire</div>
        <div style={{ fontSize: 12, color: "#8395a7" }}>oppure clicca per selezionare (selezione multipla)</div>
      </div>

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {files.map((f, i) => <FileThumbnail key={f.id} file={f} index={i} />)}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => fileRef.current?.click()} style={{ ...pill(false), fontSize: 12 }}>+ Aggiungi altri PDF</button>
          <button onClick={handleMerge} disabled={merging || files.length < 2} style={{ ...btnAction, opacity: merging || files.length < 2 ? 0.5 : 1 }}>
            {merging ? "Unisco..." : `Unisci ${files.length} PDF`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP — Tab switcher
   ═══════════════════════════════════════════ */
export default function PDFEditor() {
  const [mode, setMode] = useState("editor"); // "editor" | "merge"

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)", color: "#ecf0f1", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* Header with mode tabs */}
      <div style={{ padding: "12px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: "linear-gradient(135deg, #E74C3C, #C0392B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, fontFamily: mono }}>P</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>PDF Editor</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMode("editor")} style={pill(mode === "editor")}>✏️ Editor</button>
          <button onClick={() => setMode("merge")} style={pill(mode === "merge")}>📎 Unisci PDF</button>
        </div>
      </div>

      {mode === "editor" ? <EditorMode /> : <MergeMode />}
    </div>
  );
}
