"use client";

import { useEffect, useState } from "react";

const MARK = (
  <svg viewBox="0 0 120 120" fill="none" aria-label="Seshn" style={{ color: "var(--accent)" }}>
    <path d="M82 38 C82 22 38 22 38 46 C38 64 82 56 82 80 C82 104 38 104 38 84" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
    <circle cx="82" cy="38" r="12.5" fill="currentColor" />
    <circle cx="38" cy="84" r="12.5" fill="currentColor" />
  </svg>
);

const LINKS: [string, string, string][] = [
  ["Features", "/features", "features"],
  ["Mission", "/mission", "mission"],
  ["Roadmap", "/roadmap", "roadmap"],
  ["Suggest", "/suggestions", "suggestions"],
  ["Stories", "/stories", "stories"],
];

const T = (props: { d?: string; children?: React.ReactNode; cls?: string }) => (
  <span className={"tbtn" + (props.cls ? " " + props.cls : "")}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">{props.children}</svg>
  </span>
);

export default function DawBar({ active, home = false }: { active?: string; home?: boolean }) {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the drawer is open. `overflow:hidden` alone is
  // ignored by iOS Safari for touch scrolling (the page scrolls behind the menu),
  // so freeze the body with position:fixed at the current offset and restore it
  // (and the scroll position) on close.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.classList.add("smn-lock");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.classList.remove("smn-lock");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      <div className="daw-bar">
        <div className="left">
          <a href="/" className="brand">
            {MARK}
            SESHN<span className="suffix">.daw</span>
          </a>
          {home && (
            <span className="file" style={{ color: "var(--ink-3)" }}>
              FILE · collab_session_v1.2 &nbsp;·&nbsp; SR 48k &nbsp;·&nbsp; BIT 24
            </span>
          )}
        </div>

        {home && (
          <div className="transport">
            <span>BPM 122</span>
            <T><path d="M6 6h2v12H6zm3 6l9 6V6z" /></T>
            <T><path d="M8 5v14l11-7z" /></T>
            <T><path d="M6 6h12v12H6z" /></T>
            <T cls="rec"><circle cx="12" cy="12" r="6" /></T>
            <span className="tc">00:01:42</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="links">
            {LINKS.map(([label, href, key]) => (
              <a key={href} href={href} className={"txt" + (active === key ? " active" : "")}>{label.toUpperCase()}</a>
            ))}
            <a href="/auth?mode=signin" className="txt">SIGN IN</a>
            <a href="/auth" className="cta">START SESSION →</a>
          </div>
          <button className="daw-hamburger" aria-label="Menu" onClick={() => setOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="daw-drawer-overlay" onClick={() => setOpen(false)} />
          <div className="daw-drawer" role="dialog" aria-modal="true">
            <button className="x" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
            {LINKS.map(([label, href, key]) => (
              <a key={href} href={href} className={active === key ? "active" : ""} onClick={() => setOpen(false)}>{label.toUpperCase()}</a>
            ))}
            <a href="/auth?mode=signin" onClick={() => setOpen(false)}>SIGN IN</a>
            <a href="/auth" className="btn primary cta" onClick={() => setOpen(false)}>START SESSION →</a>
          </div>
        </>
      )}
    </>
  );
}
