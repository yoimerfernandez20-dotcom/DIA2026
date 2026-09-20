import type { Line } from "./types";

export type ParsedAlbaran = {
  number: string;
  date: string;
  lines: Line[];
};

const uid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

/** Filas que parecen cabecera/pie y no un producto, aunque lleven un número largo. */
const NON_PRODUCT_ROW = /albar[aá]n|pedido|fecha|cliente|tienda|n\.?i\.?f|c\.?i\.?f|tel[eé]f|factura|matr[ií]cula|transport|direcci[oó]n|c\.?p\.?\s*\d|total|p[aá]gina|pag\./i;
const PALLET_ROW = /palet\w*\s*(?:n[ºo°.]{0,2}\s*)?[:#-]?\s*([A-Za-z0-9\-\/]+)/i;

/** ¿Es un token que parece un código de producto? (EAN-8/12/13/14 o código interno numérico de 6-14 cifras) */
const isCodeToken = (t: string) => /^\d{6,14}$/.test(t);

/** Entero, o decimal con solo ceros ("12", "12,00", "12.000") -> número. Otro decimal (precio) -> null. */
function intLike(t: string): number | null {
  const m = t.match(/^(\d{1,5})(?:[.,]0+)?$/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseDate(text: string): string {
  const m = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseNumber(text: string): string {
  const m = text.match(/albar[aá]n\s*(?:n[ºo°.]{0,2}|num(?:ero|\.)?)?\s*[:#\-]?\s*([A-Za-z]{0,3}[\s\-]?\d[\w\/\-]{3,})/i);
  return m ? m[1].replace(/\s+/g, "") : "";
}

/**
 * Convierte las líneas de texto de un albarán en un albarán estructurado.
 * Es una heurística: busca filas con un código de producto y toma la primera cantidad entera
 * que aparece a continuación. Siempre se revisa en la pantalla de importación antes de guardar.
 */
export function parseAlbaranText(rows: string[]): ParsedAlbaran {
  const full = rows.join("\n");
  const number = parseNumber(full);
  const date = parseDate(full);

  const lines: Line[] = [];
  let pallet: string | undefined;

  for (const raw of rows) {
    const row = raw.replace(/\s+/g, " ").trim();
    if (!row) continue;
    const tokens = row.split(" ");
    const codeIdx = tokens.findIndex(isCodeToken);

    if (codeIdx === -1) {
      const p = row.match(PALLET_ROW);
      if (p) pallet = p[1];
      continue;
    }
    if (NON_PRODUCT_ROW.test(row)) continue;

    const code = tokens[codeIdx];
    // Cantidad: primer entero tras el código; si no hay, el último antes; si tampoco, 1.
    let expected: number | null = null;
    let qtyIdx = -1;
    for (let i = codeIdx + 1; i < tokens.length; i++) {
      const n = intLike(tokens[i]);
      if (n !== null && n > 0) {
        expected = n;
        qtyIdx = i;
        break;
      }
    }
    if (expected === null) {
      for (let i = codeIdx - 1; i >= 0; i--) {
        const n = intLike(tokens[i]);
        if (n !== null && n > 0) {
          expected = n;
          qtyIdx = i;
          break;
        }
      }
    }
    const description = tokens
      .filter((t, i) => i !== codeIdx && i !== qtyIdx && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t))
      .join(" ");

    lines.push({ id: uid(), code, description, expected: expected ?? 1, pallet, aliases: [] });
  }

  return { number, date, lines };
}
