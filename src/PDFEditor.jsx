import { useState, useRef, useEffect, useCallback } from "react";

const PDF_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

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

const FONTS = [
  { label: "Sans Serif", value: "Helvetica, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "'Courier New', Courier, monospace" },
];

const COLORS = [
  { label: "Nero", hex: "#000000" },
  { label: "Rosso", hex: "#C0392B" },
  { label: "Blu", hex: "#2980B9" },
  { label: "Verde", hex: "#27AE60" },
  { label: "Grigio", hex: "#7F8C8D" },
  { label: "Bianco", hex: "#FFFFFF" },
];

const TOOLS = { SELECT: "select", TEXT: "text", WHITEOUT: "whiteout", IMAGE: "image" };

/* ═══════════════════════════════════════════
   Draggable Text Overlay
   ═══════════════════════════════════════════ */
function TextOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(item._new || false);
  const dragOff = useRef({ x: 0, y: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (item._new) onUpdate({ ...item, _new: false });
    }
  }, [editing]);

  const onMD = (e) => {
    if (editing) return;
    e.stopPropagation();
    onSelect();
    setDragging(true);
    const r = e.currentTarget.getBoundingClientRect();
    dragOff.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useEffect(() => {
    if (!dragging) return;
    const mv = (e) => {
      if (!containerRef.current) return;
      const c = containerRef.current.getBoundingClientRect();
      onUpdate({ ...item, x: Math.max(0, (e.clientX - c.left - dragOff.current.x) / scale), y: Math.max(0, (e.clientY - c.top - dragOff.current.y) / scale) });
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [dragging, scale, item]);

  return (
    <div
      style={{
        position: "absolute", left: item.x * scale, top: item.y * scale,
        fontSize: item.fontSize * scale, fontFamily: item.fontFamily, color: item.color,
        cursor: dragging ? "grabbing" : editing ? "text" : "grab",
        border: selected ? "2px dashed #E74C3C" : "2px dashed transparent",
        borderRadius: 3, padding: "2px 4px",
        background: selected ? "rgba(231,76,60,0.07)" : "transparent",
        userSelect: editing ? "text" : "none", whiteSpace: "pre-wrap",
        minWidth: 24 * scale, minHeight: item.fontSize * scale * 1.2,
        lineHeight: 1.35, zIndex: selected ? 20 : 10,
        fontWeight: item.bold ? "bold" : "normal", fontStyle: item.italic ? "italic" : "normal",
      }}
      onMouseDown={onMD}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); onSelect(); }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {editing ? (
        <textarea ref={inputRef} value={item.text}
          onChange={(e) => onUpdate({ ...item, text: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
          style={{ font: "inherit", color: "inherit", background: "rgba(255,255,255,0.92)", border: "none", outline: "none", resize: "both", minWidth: 80, minHeight: item.fontSize * scale * 1.2, padding: 2, margin: 0, lineHeight: "inherit", fontWeight: "inherit", fontStyle: "inherit" }}
        />
      ) : <span>{item.text || " "}</span>}
      {selected && !editing && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ position: "absolute", top: -12, right: -12, width: 22, height: 22, borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>×</button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Whiteout Rectangle
   ═══════════════════════════════════════════ */
function WhiteoutOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [mode, setMode] = useState(null);
  const start = useRef({});

  const onMD = (e, type) => {
    e.stopPropagation(); onSelect(); setMode(type);
    start.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h };
  };

  useEffect(() => {
    if (!mode) return;
    const mv = (e) => {
      const dx = (e.clientX - start.current.mx) / scale;
      const dy = (e.clientY - start.current.my) / scale;
      if (mode === "drag") onUpdate({ ...item, x: Math.max(0, start.current.x + dx), y: Math.max(0, start.current.y + dy) });
      else onUpdate({ ...item, w: Math.max(20, start.current.w + dx), h: Math.max(10, start.current.h + dy) });
    };
    const up = () => setMode(null);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [mode, scale, item]);

  return (
    <div onMouseDown={(e) => onMD(e, "drag")} onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: "absolute", left: item.x * scale, top: item.y * scale,
        width: item.w * scale, height: item.h * scale,
        background: item.fillColor || "#FFFFFF",
        border: selected ? "2px dashed #E74C3C" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 2, cursor: "move", zIndex: 8, boxSizing: "border-box",
      }}>
      <div onMouseDown={(e) => onMD(e, "resize")}
        style={{ position: "absolute", bottom: -4, right: -4, width: 10, height: 10, background: selected ? "#E74C3C" : "transparent", borderRadius: 2, cursor: "nwse-resize" }} />
      {selected && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ position: "absolute", top: -12, right: -12, width: 22, height: 22, borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>×</button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Image Overlay — drag, resize with aspect lock
   ═══════════════════════════════════════════ */
function ImageOverlay({ item, scale, selected, onSelect, onUpdate, onDelete, containerRef }) {
  const [mode, setMode] = useState(null); // null | "drag" | "resize"
  const start = useRef({});

  const onMD = (e, type) => {
    e.stopPropagation(); onSelect(); setMode(type);
    start.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h };
  };

  useEffect(() => {
    if (!mode) return;
    const mv = (e) => {
      const dx = (e.clientX - start.current.mx) / scale;
      const dy = (e.clientY - start.current.my) / scale;
      if (mode === "drag") {
        onUpdate({ ...item, x: Math.max(0, start.current.x + dx), y: Math.max(0, start.current.y + dy) });
      } else {
        // Resize — hold shift for free, default keeps aspect ratio
        const aspect = start.current.w / start.current.h;
        if (e.shiftKey) {
          onUpdate({ ...item, w: Math.max(20, start.current.w + dx), h: Math.max(20, start.current.h + dy) });
        } else {
          const newW = Math.max(20, start.current.w + dx);
          onUpdate({ ...item, w: newW, h: newW / aspect });
        }
      }
    };
    const up = () => setMode(null);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [mode, scale, item]);

  return (
    <div
      onMouseDown={(e) => onMD(e, "drag")}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: "absolute",
        left: item.x * scale, top: item.y * scale,
        width: item.w * scale, height: item.h * scale,
        border: selected ? "2px dashed #E74C3C" : "2px dashed transparent",
        borderRadius: 3, cursor: "move", zIndex: selected ? 18 : 9,
        boxSizing: "border-box", overflow: "hidden",
      }}
    >
      <img
        src={item.dataUrl}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }}
      />
      {/* Resize handle */}
      <div
        onMouseDown={(e) => onMD(e, "resize")}
        style={{
          position: "absolute", bottom: -4, right: -4, width: 12, height: 12,
          background: selected ? "#E74C3C" : "rgba(0,0,0,0.15)",
          borderRadius: 2, cursor: "nwse-resize",
          border: "1px solid rgba(255,255,255,0.5)",
        }}
      />
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: -12, right: -12, width: 22, height: 22,
            borderRadius: "50%", background: "#E74C3C", color: "#fff", border: "none",
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", lineHeight: 1, padding: 0,
          }}
        >×</button>
      )}
      {/* Opacity overlay indicator when selected */}
      {selected && (
        <div style={{
          position: "absolute", bottom: 4, left: 4, fontSize: 9, color: "#fff",
          background: "rgba(0,0,0,0.5)", padding: "2px 5px", borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none",
        }}>
          {Math.round(item.w)}×{Math.round(item.h)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page View
   ═══════════════════════════════════════════ */
function PageView({ pageNum, pdfDoc, overlays, scale, selectedId, activeTool, onSelect, onUpdate, onDelete, onAddText, onAddWhiteout }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const drawStart = useRef(null);
  const [tempRect, setTempRect] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = vp.width; canvas.height = vp.height;
      setDims({ w: vp.width, h: vp.height });
      if (!c) await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    })();
    return () => { c = true; };
  }, [pdfDoc, pageNum, scale]);

  const pos = (e) => {
    const r = containerRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const onMD = (e) => { if (activeTool === TOOLS.WHITEOUT) { drawStart.current = pos(e); setTempRect({ ...pos(e), w: 0, h: 0 }); } };
  const onMM = (e) => {
    if (activeTool === TOOLS.WHITEOUT && drawStart.current) {
      const p = pos(e);
      setTempRect({ x: Math.min(drawStart.current.x, p.x), y: Math.min(drawStart.current.y, p.y), w: Math.abs(p.x - drawStart.current.x), h: Math.abs(p.y - drawStart.current.y) });
    }
  };
  const onMU = () => {
    if (activeTool === TOOLS.WHITEOUT && tempRect && tempRect.w > 5 && tempRect.h > 5) onAddWhiteout(pageNum, tempRect.x, tempRect.y, tempRect.w, tempRect.h);
    drawStart.current = null; setTempRect(null);
  };

  const onClick = (e) => {
    if (activeTool === TOOLS.TEXT) { onAddText(pageNum, pos(e).x, pos(e).y); }
    else onSelect(null);
  };

  const onDbl = (e) => {
    if (activeTool === TOOLS.SELECT) onAddText(pageNum, pos(e).x, pos(e).y);
  };

  const cursorMap = {
    [TOOLS.WHITEOUT]: "crosshair",
    [TOOLS.TEXT]: "text",
    [TOOLS.IMAGE]: "copy",
    [TOOLS.SELECT]: "default",
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, color: "#8395a7", marginBottom: 6, fontFamily: "var(--mono)", letterSpacing: 1, textTransform: "uppercase" }}>Pagina {pageNum}</div>
      <div ref={containerRef} onClick={onClick} onDoubleClick={onDbl} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}
        style={{
          position: "relative", width: dims.w || "100%", height: dims.h || 400,
          boxShadow: "0 6px 32px rgba(0,0,0,0.25)", borderRadius: 6, overflow: "hidden", background: "#fff",
          cursor: cursorMap[activeTool] || "default",
        }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />

        {/* Layer order: whiteouts → images → text */}
        {overlays.filter((o) => o.page === pageNum && o.type === "whiteout").map((o) => (
          <WhiteoutOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />
        ))}
        {overlays.filter((o) => o.page === pageNum && o.type === "image").map((o) => (
          <ImageOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />
        ))}
        {overlays.filter((o) => o.page === pageNum && o.type === "text").map((o) => (
          <TextOverlay key={o.id} item={o} scale={scale} selected={selectedId === o.id} onSelect={() => onSelect(o.id)} onUpdate={onUpdate} onDelete={() => onDelete(o.id)} containerRef={containerRef} />
        ))}
        {tempRect && (
          <div style={{ position: "absolute", left: tempRect.x * scale, top: tempRect.y * scale, width: tempRect.w * scale, height: tempRect.h * scale, background: "rgba(255,255,255,0.85)", border: "2px dashed #E74C3C", borderRadius: 2, pointerEvents: "none", zIndex: 30 }} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Editor
   ═══════════════════════════════════════════ */
export default function PDFEditor() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [fileName, setFileName] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [overlays, setOverlays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(1.3);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const idC = useRef(0);
  const fileRef = useRef(null);
  const imgInputRef = useRef(null);

  // Text defaults
  const [defFont, setDefFont] = useState(FONTS[0].value);
  const [defSize, setDefSize] = useState(14);
  const [defColor, setDefColor] = useState("#000000");
  const [defBold, setDefBold] = useState(false);
  const [defItalic, setDefItalic] = useState(false);

  const sel = overlays.find((o) => o.id === selectedId);

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") { setError("Seleziona un PDF valido."); return; }
    setError(""); setLoading(true);
    try {
      const lib = await initPdfJs();
      const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      setPdfDoc(doc); setNumPages(doc.numPages); setFileName(file.name);
      setOverlays([]); setSelectedId(null);
    } catch (e) { setError("Errore: " + e.message); }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }, [handleFile]);

  const addText = (page, x, y) => {
    const id = ++idC.current;
    setOverlays((p) => [...p, { id, type: "text", page, x, y, text: "Testo", fontSize: defSize, fontFamily: defFont, color: defColor, bold: defBold, italic: defItalic, _new: true }]);
    setSelectedId(id);
    if (activeTool === TOOLS.TEXT) setActiveTool(TOOLS.SELECT);
  };

  const addWhiteout = (page, x, y, w, h) => {
    const id = ++idC.current;
    setOverlays((p) => [...p, { id, type: "whiteout", page, x, y, w, h, fillColor: "#FFFFFF" }]);
    setSelectedId(id);
  };

  // ── Add Image ──
  const handleImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) { setError("Seleziona un'immagine valida (PNG, JPG, etc)."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Scale image to fit reasonably (max 300px wide at scale=1)
        const maxW = 300;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW) { const r = maxW / w; w = maxW; h = h * r; }

        const id = ++idC.current;
        // Place on page 1 by default, centered-ish
        const targetPage = 1;
        setOverlays((p) => [...p, {
          id, type: "image", page: targetPage,
          x: 50, y: 50, w, h,
          dataUrl: ev.target.result,
          naturalW: img.naturalWidth, naturalH: img.naturalHeight,
        }]);
        setSelectedId(id);
        setActiveTool(TOOLS.SELECT);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const updateOverlay = (u) => setOverlays((p) => p.map((o) => (o.id === u.id ? u : o)));
  const deleteOverlay = (id) => { setOverlays((p) => p.filter((o) => o.id !== id)); if (selectedId === id) setSelectedId(null); };

  const updateSel = (patch) => {
    if (!sel) return;
    updateOverlay({ ...sel, ...patch });
    if (sel.type === "text") {
      if (patch.fontSize !== undefined) setDefSize(patch.fontSize);
      if (patch.fontFamily !== undefined) setDefFont(patch.fontFamily);
      if (patch.color !== undefined) setDefColor(patch.color);
      if (patch.bold !== undefined) setDefBold(patch.bold);
      if (patch.italic !== undefined) setDefItalic(patch.italic);
    }
  };

  /* ── Export ── */
  const handleExport = async () => {
    if (!pdfDoc) return;
    setExporting(true);
    try {
      const rs = 2;
      const imgs = [];
      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: rs });
        const cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height;
        const ctx = cv.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        // Whiteouts
        overlays.filter((o) => o.page === p && o.type === "whiteout").forEach((o) => {
          ctx.fillStyle = o.fillColor || "#FFF";
          ctx.fillRect(o.x * rs, o.y * rs, o.w * rs, o.h * rs);
        });

        // Images
        const imageOverlays = overlays.filter((o) => o.page === p && o.type === "image");
        for (const o of imageOverlays) {
          const img = new Image();
          await new Promise((resolve) => { img.onload = resolve; img.src = o.dataUrl; });
          ctx.drawImage(img, o.x * rs, o.y * rs, o.w * rs, o.h * rs);
        }

        // Text
        overlays.filter((o) => o.page === p && o.type === "text").forEach((o) => {
          ctx.save();
          ctx.font = `${o.italic ? "italic " : ""}${o.bold ? "bold " : ""}${o.fontSize * rs}px ${o.fontFamily}`;
          ctx.fillStyle = o.color; ctx.textBaseline = "top";
          o.text.split("\n").forEach((l, i) => ctx.fillText(l, o.x * rs, o.y * rs + i * o.fontSize * rs * 1.35));
          ctx.restore();
        });

        imgs.push({ d: cv.toDataURL("image/jpeg", 0.93), w: vp.width / rs, h: vp.height / rs });
      }
      if (!window.PDFLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
      const pdf = await window.PDFLib.PDFDocument.create();
      for (const img of imgs) {
        const pg = pdf.addPage([img.w, img.h]);
        pg.drawImage(await pdf.embedJpg(await (await fetch(img.d)).arrayBuffer()), { x: 0, y: 0, width: img.w, height: img.h });
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }));
      a.download = fileName.replace(/\.pdf$/i, "") + "_editato.pdf";
      a.click();
    } catch (e) { setError("Errore export: " + e.message); }
    setExporting(false);
  };

  /* ── Styles ── */
  const mono = "'JetBrains Mono', monospace";
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

  const isText = sel?.type === "text";
  const isWO = sel?.type === "whiteout";
  const isImg = sel?.type === "image";
  const showTextProps = isText || activeTool === TOOLS.TEXT || (!sel && activeTool === TOOLS.SELECT);

  const hints = {
    [TOOLS.SELECT]: "Doppio click → aggiungi testo · Click elemento → seleziona · Trascina → sposta",
    [TOOLS.TEXT]: "Click sulla pagina per posizionare un nuovo blocco di testo",
    [TOOLS.WHITEOUT]: "Trascina sulla pagina per coprire il testo originale con un rettangolo",
    [TOOLS.IMAGE]: "Clicca 'Carica Immagine' nella toolbar per inserire un'immagine nel PDF",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)", color: "#ecf0f1", fontFamily: "'Segoe UI', system-ui, sans-serif", "--mono": mono }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: "linear-gradient(135deg, #E74C3C, #C0392B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, fontFamily: mono }}>P</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>PDF Editor</div>
            <div style={{ fontSize: 10, color: "#8395a7", fontFamily: mono }}>{fileName || "Nessun file"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {pdfDoc && <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#8395a7", fontFamily: mono }}>ZOOM</span>
              <input type="range" min={0.5} max={2.5} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: 70, accentColor: "#E74C3C" }} />
              <span style={{ fontSize: 11, color: "#c0c8d0", fontFamily: mono, minWidth: 32 }}>{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={() => { setOverlays([]); setSelectedId(null); fileRef.current?.click(); }} style={{ ...pill(false), fontSize: 11 }}>Cambia PDF</button>
            <button onClick={handleExport} disabled={exporting}
              style={{ background: "linear-gradient(135deg, #E74C3C, #C0392B)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: exporting ? "wait" : "pointer", fontFamily: mono, opacity: exporting ? 0.6 : 1, letterSpacing: 0.5 }}>
              {exporting ? "Esporto..." : "⬇ Esporta PDF"}
            </button>
          </>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = ""; }} />

      <div style={{ padding: "20px 28px", maxWidth: 1100, margin: "0 auto" }}>
        {error && <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 6, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#E74C3C" }}>{error}</div>}

        {!pdfDoc && !loading && (
          <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed rgba(231,76,60,0.3)", borderRadius: 14, padding: "90px 40px", textAlign: "center", cursor: "pointer", background: "rgba(231,76,60,0.03)", marginTop: 50 }}>
            <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.5 }}>📄</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Trascina qui il tuo PDF</div>
            <div style={{ fontSize: 13, color: "#8395a7" }}>oppure clicca per selezionare</div>
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: 80, color: "#8395a7" }}>Caricamento...</div>}

        {pdfDoc && !loading && <>
          {/* ── Sticky Toolbar ── */}
          <div style={{ position: "sticky", top: 52, zIndex: 90, marginLeft: -28, marginRight: -28, padding: "0 28px", marginBottom: 12 }}>
            <div style={{ background: "rgba(15,12,41,0.95)", backdropFilter: "blur(14px)", borderRadius: 0, padding: "10px 18px", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>

              {/* Tool buttons */}
              <div>
                <div style={lbl}>Strumento</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={pill(activeTool === TOOLS.SELECT)} onClick={() => setActiveTool(TOOLS.SELECT)}>↖ Seleziona</button>
                  <button style={pill(activeTool === TOOLS.TEXT)} onClick={() => setActiveTool(TOOLS.TEXT)}>T Testo</button>
                  <button style={pill(activeTool === TOOLS.WHITEOUT)} onClick={() => setActiveTool(TOOLS.WHITEOUT)}>▭ Copri</button>
                  <button style={pill(activeTool === TOOLS.IMAGE)} onClick={() => { setActiveTool(TOOLS.IMAGE); imgInputRef.current?.click(); }}>🖼 Immagine</button>
                </div>
              </div>

              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />

              {/* Text properties */}
              {showTextProps && <>
                <div>
                  <div style={lbl}>Font</div>
                  <select value={isText ? sel.fontFamily : defFont} onChange={(e) => isText ? updateSel({ fontFamily: e.target.value }) : setDefFont(e.target.value)} style={{ ...inp, width: 120 }}>
                    {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lbl}>Dimensione</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button onClick={() => { const v = Math.max(6, (isText ? sel.fontSize : defSize) - 1); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...pill(false), padding: "5px 8px", fontSize: 16, lineHeight: 1 }}>−</button>
                    <input type="number" min={6} max={120} value={isText ? sel.fontSize : defSize} onChange={(e) => { const v = Number(e.target.value); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...inp, width: 48, textAlign: "center" }} />
                    <button onClick={() => { const v = Math.min(120, (isText ? sel.fontSize : defSize) + 1); isText ? updateSel({ fontSize: v }) : setDefSize(v); }} style={{ ...pill(false), padding: "5px 8px", fontSize: 16, lineHeight: 1 }}>+</button>
                  </div>
                </div>
                <div>
                  <div style={lbl}>Colore</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {COLORS.map((c) => {
                      const on = (isText ? sel.color : defColor) === c.hex;
                      return <button key={c.hex} title={c.label} onClick={() => isText ? updateSel({ color: c.hex }) : setDefColor(c.hex)}
                        style={{ width: 22, height: 22, borderRadius: "50%", padding: 0, background: c.hex, cursor: "pointer", border: on ? "2.5px solid #E74C3C" : "2px solid rgba(255,255,255,0.15)", boxShadow: on ? "0 0 0 2px rgba(231,76,60,0.3)" : "none" }} />;
                    })}
                  </div>
                </div>
                <div>
                  <div style={lbl}>Stile</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => isText ? updateSel({ bold: !sel.bold }) : setDefBold(!defBold)} style={{ ...pill(isText ? sel.bold : defBold), fontWeight: "bold", padding: "5px 10px" }}>B</button>
                    <button onClick={() => isText ? updateSel({ italic: !sel.italic }) : setDefItalic(!defItalic)} style={{ ...pill(isText ? sel.italic : defItalic), fontStyle: "italic", padding: "5px 10px" }}>I</button>
                  </div>
                </div>
              </>}

              {/* Whiteout properties */}
              {isWO && (
                <div>
                  <div style={lbl}>Colore copertura</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {["#FFFFFF", "#F5F5F5", "#FFFDE7", "#E8EAF6"].map((c) => (
                      <button key={c} onClick={() => updateSel({ fillColor: c })}
                        style={{ width: 22, height: 22, borderRadius: "50%", padding: 0, background: c, cursor: "pointer", border: sel.fillColor === c ? "2.5px solid #E74C3C" : "2px solid rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Image properties */}
              {isImg && (
                <button onClick={() => imgInputRef.current?.click()} style={{ ...pill(false), fontSize: 11 }}>+ Altra immagine</button>
              )}

              {/* Page selector — for any selected element */}
              {sel && numPages > 1 && (
                <div>
                  <div style={lbl}>Pagina</div>
                  <select value={sel.page} onChange={(e) => updateSel({ page: Number(e.target.value) })} style={{ ...inp, width: 70 }}>
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {sel && <>
                <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
                <button onClick={() => deleteOverlay(sel.id)} style={{ ...pill(false), color: "#E74C3C" }}>✕ Elimina</button>
              </>}
            </div>

            {/* Hint */}
            <div style={{ fontSize: 11, color: "#8395a7", fontFamily: mono, padding: "6px 18px", background: "rgba(15,12,41,0.85)", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, border: "1px solid rgba(255,255,255,0.04)", borderTop: "none", letterSpacing: 0.3 }}>
              💡 {hints[activeTool]}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#576574", fontFamily: mono, marginBottom: 14 }}>
            {numPages} pagin{numPages === 1 ? "a" : "e"} · {overlays.length} element{overlays.length === 1 ? "o" : "i"}
          </div>

          {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <PageView key={p} pageNum={p} pdfDoc={pdfDoc} overlays={overlays} scale={scale} selectedId={selectedId} activeTool={activeTool} onSelect={setSelectedId} onUpdate={updateOverlay} onDelete={deleteOverlay} onAddText={addText} onAddWhiteout={addWhiteout} />
          ))}
        </>}
      </div>
    </div>
  );
}
