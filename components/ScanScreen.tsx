"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { addScan, evaluate, linkCode, lineStatus, removeScan } from "@/lib/match";
import { feedback } from "@/lib/feedback";
import type { Albaran, Line, ScanEvent } from "@/lib/types";

const CameraScanner = dynamic(() => import("./CameraScanner"), { ssr: false });

type Filter = "pending" | "all" | "issues";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-800 text-slate-300",
  partial: "bg-sky-500/20 text-sky-300",
  done: "bg-emerald-500/20 text-emerald-300",
  excess: "bg-amber-500/20 text-amber-300",
};

export default function ScanScreen(props: { albaran: Albaran; onChange: (a: Albaran) => void; onBack: () => void }) {
  const { albaran, onChange } = props;
  const { counts, events } = useMemo(() => evaluate(albaran), [albaran]);

  const [value, setValue] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [softKeyboard, setSoftKeyboard] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [lastId, setLastId] = useState<string | null>(null);
  const [linking, setLinking] = useState<ScanEvent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const last = events.find((e) => e.scan.id === lastId) ?? null;
  const issues = events.filter((e) => e.kind !== "ok");
  const expected = albaran.lines.reduce((s, l) => s + l.expected, 0);
  const done = albaran.lines.reduce((s, l) => s + Math.min(counts.get(l.id) ?? 0, l.expected), 0);
  const complete = expected > 0 && done === expected && issues.length === 0;

  // Un lector Bluetooth/USB escribe como un teclado: mantenemos el campo siempre enfocado.
  useEffect(() => {
    if (!linking) inputRef.current?.focus();
  }, [linking, cameraOn]);

  function handleCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    const res = addScan(albaran, code);
    onChange(res.albaran);
    setLastId(res.event.scan.id);
    feedback(res.event.kind);
  }

  function undo(scanId: string) {
    onChange(removeScan(albaran, scanId));
    if (scanId === lastId) setLastId(null);
  }

  function link(lineId: string) {
    if (!linking) return;
    onChange(linkCode(albaran, linking.scan.code, lineId));
    setLinking(null);
  }

  const visibleLines = albaran.lines.filter((l) => {
    const st = lineStatus(l, counts.get(l.id) ?? 0);
    if (filter === "pending") return st === "pending" || st === "partial";
    if (filter === "issues") return st === "excess";
    return true;
  });

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-3 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget && !linking) inputRef.current?.focus();
      }}
    >
      <header className="flex items-center gap-3 pt-1">
        <button onClick={props.onBack} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">Albarán {albaran.number || "sin número"}</h1>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full ${complete ? "bg-emerald-400" : "bg-emerald-600"}`}
              style={{ width: `${expected ? (done / expected) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="text-sm tabular-nums text-slate-300">
          {done}/{expected}
        </span>
      </header>

      {/* Resultado del último escaneo */}
      <section aria-live="assertive" className="min-h-36">
        {!last && !complete && (
          <div className="grid h-36 place-items-center rounded-2xl border border-dashed border-slate-700 text-slate-400">
            Escanea un producto
          </div>
        )}
        {!last && complete && (
          <div className="grid h-36 place-items-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white">
            ✓ Albarán completo
          </div>
        )}
        {last?.kind === "ok" && last.line && (
          <Banner tone="ok" title="✓ OK" line={last.line} detail={`${last.countAfter}/${last.line.expected} uds`} onUndo={() => undo(last.scan.id)} />
        )}
        {last?.kind === "extra" && last.line && (
          <Banner
            tone="extra"
            title="Sobrante"
            line={last.line}
            detail={`Ya estaba completo (${last.countAfter}/${last.line.expected})`}
            onUndo={() => undo(last.scan.id)}
          />
        )}
        {last?.kind === "unknown" && (
          <div className="rounded-2xl bg-red-600 p-4 text-white">
            <div className="text-3xl font-extrabold">✗ NO COINCIDE</div>
            <div className="mt-1 font-mono text-lg">{last.scan.code}</div>
            <div className="text-sm opacity-90">Este código no está en el albarán.</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setLinking(last)} className="rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold">
                Vincular a una línea
              </button>
              <button onClick={() => undo(last.scan.id)} className="rounded-lg bg-white/20 px-3 py-2 text-sm">
                Deshacer
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Entrada: lector externo (teclado) o escritura manual */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCode(value);
          setValue("");
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode={softKeyboard ? "text" : "none"}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          placeholder="Escanea con el lector o escribe el código"
          onBlur={() => {
            // Si el foco se pierde sin ir a otro control, lo recuperamos para no perder escaneos.
            setTimeout(() => {
              if (!linking && document.activeElement === document.body) inputRef.current?.focus();
            }, 50);
          }}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono"
        />
        <button
          type="button"
          onClick={() => {
            setSoftKeyboard((s) => !s);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          title="Mostrar/ocultar teclado del móvil"
          aria-pressed={softKeyboard}
          className={`rounded-xl px-3 ${softKeyboard ? "bg-sky-600" : "bg-slate-800"}`}
        >
          ⌨
        </button>
        <button
          type="button"
          onClick={() => setCameraOn((c) => !c)}
          aria-pressed={cameraOn}
          className={`rounded-xl px-3 ${cameraOn ? "bg-red-600" : "bg-slate-800"}`}
        >
          {cameraOn ? "Cerrar cámara" : "📷 Cámara"}
        </button>
      </form>

      {cameraOn && <CameraScanner onDetect={handleCode} />}

      {/* Líneas del albarán */}
      <nav className="flex gap-2 text-sm">
        {(
          [
            ["pending", "Pendientes"],
            ["all", "Todas"],
            ["issues", `Incidencias (${issues.length})`],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 ${filter === f ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {filter !== "issues" ? (
        <ul className="flex flex-col gap-2 pb-8">
          {visibleLines.length === 0 && <li className="p-6 text-center text-slate-500">Nada por aquí.</li>}
          {visibleLines.map((l) => {
            const c = counts.get(l.id) ?? 0;
            const st = lineStatus(l, c);
            return (
              <li key={l.id} className="flex items-center gap-3 rounded-xl bg-slate-900 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.description || "Sin descripción"}</div>
                  <div className="truncate font-mono text-xs text-slate-400">
                    {l.code}
                    {l.pallet ? ` · Palet ${l.pallet}` : ""}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm tabular-nums ${STATUS_STYLE[st]}`}>
                  {c}/{l.expected}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2 pb-8">
          {issues.length === 0 && <li className="p-6 text-center text-slate-500">Sin incidencias.</li>}
          {[...issues].reverse().map((e) => (
            <li key={e.scan.id} className="flex items-center gap-3 rounded-xl bg-slate-900 p-3">
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${e.kind === "unknown" ? "text-red-400" : "text-amber-400"}`}>
                  {e.kind === "unknown" ? "No coincide" : "Sobrante"}
                </div>
                <div className="truncate font-mono text-sm">{e.scan.code}</div>
                {e.line && <div className="truncate text-xs text-slate-400">{e.line.description}</div>}
              </div>
              {e.kind === "unknown" && (
                <button onClick={() => setLinking(e)} className="rounded-lg bg-slate-800 px-2 py-1 text-xs">
                  Vincular
                </button>
              )}
              <button onClick={() => undo(e.scan.id)} className="rounded-lg bg-slate-800 px-2 py-1 text-xs">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {linking && <LinkPicker code={linking.scan.code} lines={albaran.lines} counts={counts} onPick={link} onClose={() => setLinking(null)} />}
    </main>
  );
}

function Banner(props: {
  tone: "ok" | "extra";
  title: string;
  line: Line;
  detail: string;
  onUndo: () => void;
}) {
  const bg = props.tone === "ok" ? "bg-emerald-600" : "bg-amber-500 text-slate-950";
  return (
    <div className={`rounded-2xl p-4 text-white ${bg}`}>
      <div className="text-3xl font-extrabold">{props.title}</div>
      <div className="mt-1 text-lg font-semibold">{props.line.description || props.line.code}</div>
      <div className="font-mono text-sm opacity-90">
        {props.line.code}
        {props.line.pallet ? ` · Palet ${props.line.pallet}` : ""}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xl font-bold tabular-nums">{props.detail}</span>
        <button onClick={props.onUndo} className="rounded-lg bg-black/20 px-3 py-2 text-sm">
          Deshacer
        </button>
      </div>
    </div>
  );
}

function LinkPicker(props: {
  code: string;
  lines: Line[];
  counts: Map<string, number>;
  onPick: (lineId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = props.lines.filter((l) => `${l.code} ${l.description}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-slate-950/95 p-4" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Vincular código</h2>
          <button onClick={props.onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            Cancelar
          </button>
        </div>
        <p className="text-sm text-slate-400">
          El código <span className="font-mono text-slate-200">{props.code}</span> pertenece a una línea del albarán con otro código
          (por ejemplo el EAN frente al código interno de tienda). Elige a cuál; la próxima vez se reconocerá solo.
        </p>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código o descripción"
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3"
        />
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {list.map((l) => (
            <li key={l.id}>
              <button onClick={() => props.onPick(l.id)} className="flex w-full items-center gap-3 rounded-xl bg-slate-900 p-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.description || "Sin descripción"}</div>
                  <div className="truncate font-mono text-xs text-slate-400">{l.code}</div>
                </div>
                <span className="text-sm tabular-nums text-slate-400">
                  {props.counts.get(l.id) ?? 0}/{l.expected}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
