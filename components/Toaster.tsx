"use client";

import { useEffect, useState } from "react";
import type { ToastDetail, ToastKind } from "@/lib/seshn/toast";
import "./toaster.css";

interface ToastItem extends ToastDetail {
  id: number;
}

const ICON: Record<ToastKind, string> = { success: "✓", error: "!", info: "♪" };
const DEFAULT_MS = 4200;

let seq = 0;

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = ++seq;
      setItems((prev) => [...prev, { id, ...detail }].slice(-4)); // cap the stack
      const ms = detail.duration ?? DEFAULT_MS;
      window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), ms);
    }
    window.addEventListener("seshn:toast", onToast as EventListener);
    return () => window.removeEventListener("seshn:toast", onToast as EventListener);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={"toast toast-" + t.kind}
          role="status"
          aria-live="polite"
          onClick={() => dismiss(t.id)}
        >
          <span className="toast-icon" aria-hidden="true">{ICON[t.kind]}</span>
          <span className="toast-msg">{t.message}</span>
          <span className="toast-x" aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  );
}
