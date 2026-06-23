"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Fires a GA4 page_view on client-side route changes. The initial load is
// already counted by gtag's config below, so we skip the first run to avoid a
// double count. Without this, in-app (SPA) navigations wouldn't be tracked —
// only full page loads would. Wrapped in Suspense because useSearchParams opts
// its subtree into client rendering.
function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!GA_ID || typeof window.gtag !== "function") return;
    const qs = searchParams?.toString();
    window.gtag("event", "page_view", {
      page_path: pathname + (qs ? `?${qs}` : ""),
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);
  return null;
}

// Google Analytics 4. Dormant until NEXT_PUBLIC_GA_ID is set, so dev/preview
// builds without the key never load gtag or send data. Mounted once in the root
// layout to cover the whole site.
export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
