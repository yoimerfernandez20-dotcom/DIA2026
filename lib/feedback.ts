let ctx: AudioContext | null = null;

function beep(freq: number, ms: number, delay = 0) {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = "square";
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime + delay;
    o.start(t);
    o.stop(t + ms / 1000);
  } catch {
    /* sin audio: no pasa nada */
  }
}

/** Pitido + vibración distintos según el resultado, para poder escanear sin mirar la pantalla. */
export function feedback(kind: "ok" | "extra" | "unknown") {
  if (kind === "ok") {
    beep(1000, 90);
    navigator.vibrate?.(40);
  } else if (kind === "extra") {
    beep(600, 120);
    beep(600, 120, 0.18);
    navigator.vibrate?.([60, 40, 60]);
  } else {
    beep(180, 350);
    navigator.vibrate?.([200, 80, 200]);
  }
}
