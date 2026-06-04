"use client";

import { useEffect, useRef, useState } from "react";
import { Vinyl } from "@/components/visual/Vinyl";
import "./producer-mode.css";

// Hidden easter egg: the Konami code (↑↑↓↓←→←→ B A) drops the beat — a vinyl
// spins up, notes float by, the screen pulses like a kick, and a toast pops.
// Mounted once in the root layout so it works on every page. Renders nothing
// until triggered; the overlay is pointer-events:none so it never blocks the UI.
const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];

const NOTES = ["♪", "♫", "♩", "♬", "𝄞"];

interface FloatNote {
  id: number;
  left: number;
  glyph: string;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

export default function ProducerMode() {
  const [active, setActive] = useState(false);
  const [burst, setBurst] = useState(0); // bump to restart animations on re-trigger
  const [reduced, setReduced] = useState(false);
  const [notes, setNotes] = useState<FloatNote[]>([]);
  const progress = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    setReduced(!!mq?.matches);
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq?.addEventListener?.("change", onMq);

    function trigger() {
      setBurst((b) => b + 1);
      setActive(true);
      if (!mq?.matches) {
        setNotes(
          Array.from({ length: 18 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            glyph: NOTES[Math.floor(Math.random() * NOTES.length)],
            delay: Math.random() * 1.2,
            duration: 2.4 + Math.random() * 1.8,
            size: 18 + Math.random() * 30,
            drift: (Math.random() - 0.5) * 120,
          })),
        );
      } else {
        setNotes([]);
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), 4600);
    }

    function onKey(e: KeyboardEvent) {
      const key = (e.key || "").toLowerCase();
      // Advance through the sequence; a wrong key restarts (but still lets the
      // current key seed a fresh start if it matches step 0).
      if (key === KONAMI[progress.current]) {
        progress.current += 1;
        if (progress.current === KONAMI.length) {
          progress.current = 0;
          trigger();
        }
      } else {
        progress.current = key === KONAMI[0] ? 1 : 0;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq?.removeEventListener?.("change", onMq);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div className={"pm-overlay" + (reduced ? " reduced" : "")} aria-hidden="true" key={burst}>
      {!reduced && <div className="pm-flash" />}
      <div className="pm-center">
        <div className={reduced ? "pm-vinyl" : "pm-vinyl pm-spin"}>
          <Vinyl size={132} color="#0d0d0d" label="var(--accent)" />
        </div>
      </div>
      {!reduced &&
        notes.map((n) => (
          <span
            key={n.id}
            className="pm-note"
            style={{
              left: n.left + "%",
              fontSize: n.size,
              animationDelay: n.delay + "s",
              animationDuration: n.duration + "s",
              ["--pm-drift" as string]: n.drift + "px",
            }}
          >
            {n.glyph}
          </span>
        ))}
      <div className="pm-toast" role="status">
        <span className="pm-toast-icon">🎛️</span>
        <span>
          <strong>Producer mode unlocked</strong>
          <span className="pm-toast-sub">that&apos;s the one. now go make something.</span>
        </span>
      </div>
    </div>
  );
}
