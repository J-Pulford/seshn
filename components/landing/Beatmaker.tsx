"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SeshnBeatmaker?: { mount: (el: HTMLElement, opts: Record<string, unknown>) => void };
  }
}

// Mounts the vendored Web Audio beatmaker into a ref (client-only via dynamic
// import, so it never runs during SSR). Theme matches the dark Studio palette.
export default function Beatmaker() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("./beatmaker.lib.js").then(() => {
      if (cancelled || !ref.current || !window.SeshnBeatmaker) return;
      if (ref.current.childElementCount > 0) return; // guard double-mount (StrictMode)
      window.SeshnBeatmaker.mount(ref.current, {
        accent: "#2CCB73", bg: "#0a0a09", panel: "#1a1a18", panel2: "#21211e",
        line: "#2d2d29", ink: "#e9e8e0", ink2: "#b6b5ab", ink3: "#74736a",
        font: '"Inter Tight", system-ui, sans-serif', fontMono: '"JetBrains Mono", monospace',
        onAccentText: "#0a0a09", square: false, bpm: 92,
      });
    });
    return () => { cancelled = true; };
  }, []);

  return <div ref={ref} className="bm-card" />;
}
