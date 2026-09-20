"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Albaran } from "./types";

const KEY = "albaran-scan:v1";

export function useAlbaranes() {
  const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setAlbaranes(JSON.parse(raw));
    } catch {
      /* datos corruptos: empezamos vacíos */
    }
    loaded.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(albaranes));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [albaranes]);

  const upsert = useCallback((a: Albaran) => {
    setAlbaranes((prev) => (prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [a, ...prev]));
  }, []);

  const remove = useCallback((id: string) => {
    setAlbaranes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { albaranes, ready, upsert, remove };
}
