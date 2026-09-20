"use client";
import { evaluate } from "@/lib/match";
import type { Albaran } from "@/lib/types";

function progress(a: Albaran) {
  const { counts, events } = evaluate(a);
  const expected = a.lines.reduce((s, l) => s + l.expected, 0);
  const done = a.lines.reduce((s, l) => s + Math.min(counts.get(l.id) ?? 0, l.expected), 0);
  const issues = events.filter((e) => e.kind !== "ok").length;
  return { expected, done, issues };
}

export default function AlbaranList(props: {
  albaranes: Albaran[];
  ready: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold">Control de almacén</h1>
          <p className="text-sm text-slate-400">Comprueba los productos contra el albarán</p>
        </div>
      </header>

      <button
        onClick={props.onNew}
        className="rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-semibold text-slate-950 active:scale-[0.99]"
      >
        + Nuevo albarán (importar PDF)
      </button>

      {props.ready && props.albaranes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
          Aún no hay albaranes. Importa el PDF de un albarán y empieza a escanear los productos del palet.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {props.albaranes.map((a) => {
          const p = progress(a);
          const pct = p.expected ? Math.round((p.done / p.expected) * 100) : 0;
          return (
            <li key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <button onClick={() => props.onOpen(a.id)} className="block w-full text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">Albarán {a.number || "sin número"}</span>
                  <span className="text-sm text-slate-400">{a.date || ""}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-sm text-slate-400">
                  <span>
                    {p.done}/{p.expected} uds · {a.lines.length} líneas
                  </span>
                  {p.issues > 0 && <span className="text-amber-400">{p.issues} incidencias</span>}
                </div>
              </button>
              <button
                onClick={() => confirm(`¿Borrar el albarán ${a.number || ""}?`) && props.onDelete(a.id)}
                className="mt-2 text-xs text-slate-500 underline"
              >
                Borrar
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
