"use client";

import { useEffect, useRef, useState } from "react";
import type { ConfirmEventDetail, ConfirmOptions, ConfirmResult } from "@/lib/seshn/confirm";
import "./confirm.css";

interface Active {
  opts: ConfirmOptions;
  resolve: (r: ConfirmResult) => void;
}

export default function ConfirmHost() {
  const [active, setActive] = useState<Active | null>(null);
  const [value, setValue] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onConfirm(e: Event) {
      const detail = (e as CustomEvent<ConfirmEventDetail>).detail;
      if (!detail?.opts) return;
      setValue(detail.opts.defaultValue || "");
      setActive(detail);
    }
    window.addEventListener("seshn:confirm", onConfirm as EventListener);
    return () => window.removeEventListener("seshn:confirm", onConfirm as EventListener);
  }, []);

  useEffect(() => {
    if (!active) return;
    // Focus the input (prompt) or the confirm button when the dialog opens.
    const t = window.setTimeout(() => (active.opts.prompt ? inputRef.current : confirmRef.current)?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!active) return null;
  const { opts, resolve } = active;

  function close(result: ConfirmResult) {
    resolve(result);
    setActive(null);
    setValue("");
  }
  const onCancel = () => close({ confirmed: false });
  const onConfirm = () => close({ confirmed: true, value: opts.prompt ? value : undefined });

  const blocked = !!opts.requireText && value.trim() !== opts.requireText;

  return (
    <div
      className="cf-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="cf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !opts.prompt && !blocked) onConfirm();
        }}
      >
        <div className="cf-title" id="cf-title">{opts.title}</div>
        {opts.message && <p className="cf-message">{opts.message}</p>}

        {opts.prompt && (
          <label className="cf-field">
            {opts.promptLabel && <span className="cf-field-label">{opts.promptLabel}</span>}
            <input
              ref={inputRef}
              type="text"
              value={value}
              placeholder={opts.promptPlaceholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        {!opts.prompt && opts.requireText && (
          <label className="cf-field">
            <span className="cf-field-label">Type <b>{opts.requireText}</b> to confirm</span>
            <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={opts.requireText} />
          </label>
        )}

        <div className="cf-actions">
          <button type="button" className="btn" onClick={onCancel}>{opts.cancelLabel || "Cancel"}</button>
          <button
            ref={confirmRef}
            type="button"
            className={"btn " + (opts.danger ? "danger" : "primary")}
            disabled={blocked}
            onClick={onConfirm}
          >
            {opts.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
