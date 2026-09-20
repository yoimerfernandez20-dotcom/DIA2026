import type { Albaran, Line, Scan, ScanEvent } from "./types";

/** Quita espacios, guiones y pasa a mayúsculas: "8 410 000-123" -> "8410000123". */
export function normalize(code: string): string {
  return code.replace(/[\s\-_.]/g, "").toUpperCase();
}

const isDigits = (s: string) => /^\d+$/.test(s);
const stripZeros = (s: string) => s.replace(/^0+/, "");

/**
 * "Núcleo" de un GTIN: el número sin dígito de control, sin ceros a la izquierda y sin el
 * dígito indicador de los GTIN-14 (cajas / ITF-14). Así un EAN-13, un UPC-A y el ITF-14 de
 * la caja de ese mismo producto comparten núcleo.
 */
export function gtinCore(code: string): string | null {
  const c = normalize(code);
  if (!isDigits(c)) return null;
  switch (c.length) {
    case 8:
      return stripZeros(c.slice(0, 7));
    case 12:
      return stripZeros(c.slice(0, 11));
    case 13:
      return stripZeros(c.slice(0, 12));
    case 14:
      return stripZeros(c.slice(1, 13));
    default:
      return null;
  }
}

type Via = "exact" | "gtin" | "alias";

function lineMatches(line: Line, scanned: string): Via | null {
  const s = normalize(scanned);
  if (!s) return null;
  if (normalize(line.code) === s) return "exact";
  if (line.aliases.some((a) => normalize(a) === s)) return "alias";
  // Coincidencia numérica ignorando ceros a la izquierda (códigos internos con relleno).
  if (isDigits(s) && isDigits(normalize(line.code)) && stripZeros(s) === stripZeros(normalize(line.code))) {
    return "exact";
  }
  const a = gtinCore(s);
  const b = gtinCore(line.code);
  if (a && b && a === b) return "gtin";
  return null;
}

/**
 * Reproduce los escaneos en orden y devuelve el resultado de cada uno.
 * Si un código aparece en varias líneas (p. ej. en varios palets) se rellena primero
 * la primera línea que aún tenga unidades pendientes.
 */
export function evaluate(albaran: Pick<Albaran, "lines" | "scans">) {
  const counts = new Map<string, number>();
  const events: ScanEvent[] = [];

  for (const scan of albaran.scans) {
    const candidates: { line: Line; via: Via }[] = [];
    for (const line of albaran.lines) {
      const via = lineMatches(line, scan.code);
      if (via) candidates.push({ line, via });
    }
    if (candidates.length === 0) {
      events.push({ scan, kind: "unknown" });
      continue;
    }
    const open = candidates.find((c) => (counts.get(c.line.id) ?? 0) < c.line.expected);
    const chosen = open ?? candidates[0];
    const next = (counts.get(chosen.line.id) ?? 0) + 1;
    counts.set(chosen.line.id, next);
    events.push({
      scan,
      kind: next > chosen.line.expected ? "extra" : "ok",
      line: chosen.line,
      countAfter: next,
      via: chosen.via,
    });
  }
  return { counts, events };
}

export type LineStatus = "pending" | "partial" | "done" | "excess";

export function lineStatus(line: Line, count: number): LineStatus {
  if (count === 0) return "pending";
  if (count < line.expected) return "partial";
  if (count === line.expected) return "done";
  return "excess";
}

/** Añade un escaneo. La evaluación se hace con `evaluate`, así deshacer es tan simple como quitarlo. */
export function addScan(albaran: Albaran, code: string): { albaran: Albaran; event: ScanEvent } {
  const scan: Scan = { id: crypto.randomUUID(), at: Date.now(), code: code.trim() };
  const next: Albaran = { ...albaran, scans: [...albaran.scans, scan] };
  const events = evaluate(next).events;
  return { albaran: next, event: events[events.length - 1] };
}

export function removeScan(albaran: Albaran, scanId: string): Albaran {
  return { ...albaran, scans: albaran.scans.filter((s) => s.id !== scanId) };
}

/** Vincula un código desconocido a una línea del albarán (p. ej. un EAN distinto al código de tienda). */
export function linkCode(albaran: Albaran, code: string, lineId: string): Albaran {
  const norm = normalize(code);
  return {
    ...albaran,
    lines: albaran.lines.map((l) =>
      l.id === lineId && !l.aliases.some((a) => normalize(a) === norm) ? { ...l, aliases: [...l.aliases, code.trim()] } : l
    ),
  };
}
