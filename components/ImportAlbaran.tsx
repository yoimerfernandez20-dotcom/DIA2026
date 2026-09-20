"use client";
import { useState } from "react";
import { parseAlbaranText } from "@/lib/parseAlbaran";
import { extractPdfRows } from "@/lib/parsePdf";
import type { Albaran, Line } from "@/lib/types";

const newId = () => crypto.randomUUID();

export default function ImportAlbaran(props: { onCancel: () => void; onSave: (a: Albaran) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<string[] | null>(null);
  const [pasted, setPasted] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [lines, setLines] = useState<Line[] | null>(null);

  function load(extracted: string[]) {
    const parsed = parseAlbaranText(extracted);
    setRows(extracted);
    setNumber(parsed.number);
    setDate(parsed.date);
    setLines(parsed.lines);
    setError(
      parsed.lines.length === 0
        ? "No he encontrado líneas de producto. Revisa el texto extraído, pega el texto a mano o añade las líneas manualmente."
        : ""
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const extracted = await extractPdfRows(await file.arrayBuffer());
      if (extracted.length === 0) {
        setRows([]);
        setLines([]);
        setError("El PDF no contiene texto (parece un escaneo/foto). Pega el texto a mano o añade las líneas manualmente.");
      } else {
        load(extracted);
      }
    } catch (e) {
      setError(`No se pudo leer el PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const update = (id: string, patch: Partial<Line>) =>
    setLines((ls) => ls && ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function save() {
    const clean = (lines ?? []).filter((l) => l.code.trim());
    props.onSave({
      id: newId(),
      number: number.trim(),
      date,
      createdAt: Date.now(),
      lines: clean.map((l) => ({ ...l, code: l.code.trim(), expected: Math.max(1, l.expected || 1) })),
      scans: [],
    });
  }

  const input = "w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={props.onCancel} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Nuevo albarán</h1>
      </header>

      {lines === null && (
        <>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-600 p-8 text-center">
            <span className="text-lg font-semibold">{busy ? "Leyendo PDF…" : "Elegir PDF del albarán"}</span>
            <span className="text-sm text-slate-400">Se lee en tu dispositivo, no se sube a ningún servidor</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="mb-2 text-sm font-semibold">…o pega el texto del albarán</p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={5}
              placeholder={"8410000123456 LECHE ENTERA 1L 24\n8410000654321 ACEITE OLIVA 1L 12"}
              className={`${input} font-mono`}
            />
            <div className="mt-2 flex gap-2">
              <button
                disabled={!pasted.trim()}
                onClick={() => load(pasted.split("\n"))}
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm disabled:opacity-40"
              >
                Analizar texto
              </button>
              <button
                onClick={() => {
                  setLines([]);
                  setRows([]);
                }}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
              >
                Crear vacío y añadir líneas
              </button>
            </div>
          </div>
        </>
      )}

      {error && <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">{error}</div>}

      {lines !== null && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              Nº de albarán
              <input value={number} onChange={(e) => setNumber(e.target.value)} className={`${input} mt-1`} />
            </label>
            <label className="text-xs text-slate-400">
              Fecha
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} mt-1`} />
            </label>
          </div>

          <p className="text-sm text-slate-400">
            Revisa que los códigos y cantidades son correctos antes de empezar a escanear ({lines.length} líneas).
          </p>

          <ul className="flex flex-col gap-2">
            {lines.map((l) => (
              <li key={l.id} className="grid grid-cols-[1fr_4.5rem_auto] items-center gap-2 rounded-xl bg-slate-900 p-2">
                <div className="flex flex-col gap-1">
                  <input
                    aria-label="Código"
                    value={l.code}
                    onChange={(e) => update(l.id, { code: e.target.value })}
                    placeholder="Código"
                    className={`${input} font-mono`}
                  />
                  <input
                    aria-label="Descripción"
                    value={l.description}
                    onChange={(e) => update(l.id, { description: e.target.value })}
                    placeholder="Descripción"
                    className={input}
                  />
                  <input
                    aria-label="Palet"
                    value={l.pallet ?? ""}
                    onChange={(e) => update(l.id, { pallet: e.target.value || undefined })}
                    placeholder="Palet (opcional)"
                    className={input}
                  />
                </div>
                <input
                  aria-label="Unidades"
                  type="number"
                  min={1}
                  value={l.expected}
                  onChange={(e) => update(l.id, { expected: parseInt(e.target.value, 10) || 0 })}
                  className={`${input} text-center`}
                />
                <button
                  aria-label="Quitar línea"
                  onClick={() => setLines((ls) => ls && ls.filter((x) => x.id !== l.id))}
                  className="rounded-lg px-2 py-2 text-slate-400 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() =>
              setLines((ls) => [...(ls ?? []), { id: newId(), code: "", description: "", expected: 1, aliases: [] }])
            }
            className="self-start rounded-lg bg-slate-800 px-3 py-2 text-sm"
          >
            + Añadir línea
          </button>

          {rows && rows.length > 0 && (
            <details className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">
              <summary className="cursor-pointer">Ver texto extraído del PDF</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{rows.join("\n")}</pre>
            </details>
          )}

          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
            <button
              onClick={() => {
                setLines(null);
                setRows(null);
                setError("");
              }}
              className="rounded-xl bg-slate-800 px-4 py-3"
            >
              Empezar de nuevo
            </button>
            <button
              onClick={save}
              disabled={!lines.some((l) => l.code.trim())}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-lg font-semibold text-slate-950 disabled:opacity-40"
            >
              Guardar y escanear
            </button>
          </div>
        </>
      )}
    </main>
  );
}
