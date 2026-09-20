"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Lector por cámara con ZXing (funciona en Chrome, Safari/iOS y Firefox).
 * Requiere HTTPS (o localhost) para que el navegador dé acceso a la cámara.
 */
export default function CameraScanner(props: { onDetect: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const onDetect = useRef(props.onDetect);
  onDetect.current = props.onDetect;

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const last = { code: "", at: 0 };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("La cámara solo funciona con HTTPS (o en localhost).");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // La cámara "ve" el mismo código muchas veces seguidas: ignoramos repeticiones < 2 s.
            if (code === last.code && now - last.at < 2000) return;
            last.code = code;
            last.at = now;
            onDetect.current(code);
          }
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch (e) {
        setError(e instanceof Error ? `No se pudo abrir la cámara: ${e.message}` : "No se pudo abrir la cámara.");
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
      {!error && <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />}
      {error && <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-amber-300">{error}</div>}
    </div>
  );
}
