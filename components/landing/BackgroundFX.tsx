"use client";

import { useEffect, useRef } from "react";

// Cursor-reactive green glow that sits behind the marketing site. Two eased
// follow-points (a quick one and a slower trail) make the light pool toward the
// pointer and lag behind it, so it reads as fluid rather than a rigid spotlight.
// With no pointer (touch, or before the first move) it drifts on its own. All
// motion is written to CSS custom properties via requestAnimationFrame, so it
// composites on the GPU with zero React re-renders and never touches layout.
export default function BackgroundFX() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect the OS "reduce motion" setting: leave the static gradients, no JS loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0.5, ty = 0.3; // target (pointer), normalised 0..1
    let ax = tx, ay = ty; // fast-eased point
    let bx = tx, by = ty; // slow-eased trailing point
    let idle = true; // true until the pointer moves (then again if it leaves)
    let t = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      idle = false;
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    };
    const onLeave = () => {
      idle = true;
    };

    const tick = () => {
      if (idle) {
        // Gentle autonomous drift (a slow Lissajous path) when there's no cursor.
        t += 0.004;
        tx = 0.5 + Math.cos(t) * 0.22;
        ty = 0.4 + Math.sin(t * 1.3) * 0.18;
      }
      // Ease each point toward the target; different rates give the fluid trail.
      ax += (tx - ax) * 0.075;
      ay += (ty - ay) * 0.075;
      bx += (tx - bx) * 0.032;
      by += (ty - by) * 0.032;
      const s = el.style;
      s.setProperty("--mx", (ax * 100).toFixed(2) + "%");
      s.setProperty("--my", (ay * 100).toFixed(2) + "%");
      s.setProperty("--mx2", (bx * 100).toFixed(2) + "%");
      s.setProperty("--my2", (by * 100).toFixed(2) + "%");
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <div ref={ref} className="daw-fx" aria-hidden="true" />;
}
