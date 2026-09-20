export type Line = {
  id: string;
  /** Código del producto tal y como aparece en el albarán (EAN o código interno de tienda). */
  code: string;
  description: string;
  /** Unidades que indica el albarán. */
  expected: number;
  /** Palet al que pertenece la línea, si el albarán lo indica. */
  pallet?: string;
  /** Otros códigos que el usuario ha vinculado manualmente a esta línea. */
  aliases: string[];
};

/** Un escaneo en bruto. El resultado (OK / sobrante / no coincide) se calcula al reproducirlos. */
export type Scan = {
  id: string;
  at: number;
  code: string;
};

export type Albaran = {
  id: string;
  number: string;
  date: string; // ISO yyyy-mm-dd o vacío
  createdAt: number;
  lines: Line[];
  scans: Scan[];
};

export type ScanKind = "ok" | "extra" | "unknown";

export type ScanEvent = {
  scan: Scan;
  kind: ScanKind;
  line?: Line;
  /** Cuántas unidades de esa línea llevamos tras este escaneo. */
  countAfter?: number;
  via?: "exact" | "gtin" | "alias";
};
