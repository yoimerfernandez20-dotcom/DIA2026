export type TextItem = { str: string; x: number; y: number };

/** Agrupa los fragmentos de texto de una página en filas (misma altura = misma fila), de izquierda a derecha. */
export function groupItemsIntoRows(items: TextItem[], tolerance = 3): string[] {
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tolerance);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .sort((a, b) => b.y - a.y) // el origen del PDF está abajo: y mayor = más arriba
    .map((r) =>
      r.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .join(" ")
    );
}

/** Extrae las filas de texto de un PDF. Solo se ejecuta en el navegador. */
export async function extractPdfRows(data: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const rows: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .filter((i): i is typeof i & { str: string; transform: number[] } => "str" in i)
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
    rows.push(...groupItemsIntoRows(items));
  }
  return rows;
}
