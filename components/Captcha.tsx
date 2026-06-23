"use client";

import Script from "next/script";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// True when a Turnstile site key is configured. The auth page uses this to only
// require/await a captcha when one is actually set up — so auth keeps working
// unchanged until you turn captcha on.
export const captchaEnabled = !!SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export interface CaptchaHandle {
  reset: () => void;
}

// Cloudflare Turnstile widget. Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set. Calls onToken with the verification token (or null when it expires /
// errors). Supabase verifies the token server-side on the auth call.
const Captcha = forwardRef<CaptchaHandle, { onToken: (t: string | null) => void }>(function Captcha({ onToken }, ref) {
  const elRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  const doRender = useCallback(() => {
    if (!SITE_KEY || !window.turnstile || !elRef.current || idRef.current) return;
    idRef.current = window.turnstile.render(elRef.current, {
      sitekey: SITE_KEY,
      callback: (t: string) => onToken(t),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
      theme: "auto",
    });
  }, [onToken]);

  useImperativeHandle(
    ref,
    () => ({
      // Tokens are single-use: reset after every auth attempt to get a fresh one.
      reset() {
        onToken(null);
        if (window.turnstile && idRef.current) window.turnstile.reset(idRef.current);
      },
    }),
    [onToken],
  );

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={doRender} />
      <div ref={elRef} style={{ marginTop: 4 }} />
    </>
  );
});

export default Captcha;
