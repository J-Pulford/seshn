"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "@/lib/seshn/toast";

// Reusable share control. Uses the native share sheet when available (mobile),
// otherwise copies the link to the clipboard with inline "Copied!" feedback.
// Used on profiles and gig listings.
export function ShareButton({
  url,
  title,
  text,
  className = "btn",
  label = "Share",
  copiedLabel = "Copied!",
  icon = true,
  style,
}: {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  label?: ReactNode;
  copiedLabel?: string;
  icon?: boolean;
  style?: CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Resolve a relative path to an absolute URL at click time (SSR-safe).
  const resolve = () => {
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === "undefined") return url;
    return window.location.origin + (url.startsWith("/") ? url : "/" + url);
  };

  async function onClick() {
    const absolute = resolve();
    // Prefer the native share sheet where the browser supports it.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: absolute });
        return;
      } catch (e) {
        // AbortError = user dismissed the sheet; don't fall through to copy.
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(absolute);
      } else {
        const ta = document.createElement("textarea");
        ta.value = absolute;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Link copied to clipboard");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={onClick} aria-label={typeof label === "string" ? label : "Share"}>
      {icon && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }} aria-hidden="true">
          {copied ? (
            <polyline points="20 6 9 17 4 12" />
          ) : (
            <>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
              <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
            </>
          )}
        </svg>
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

export default ShareButton;
