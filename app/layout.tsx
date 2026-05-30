import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seshn — find your next collaborator",
  description:
    "Seshn is the collaboration marketplace for musicians. Post a brief, find producers, vocalists, writers and engineers, and make your next record.",
  icons: {
    icon: [
      { url: "/assets/seshn-mark-green.svg", type: "image/svg+xml" },
      { url: "/assets/png/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/png/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/assets/png/app-icon-256.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A09" },
    { media: "(prefers-color-scheme: light)", color: "#F3F1EA" },
  ],
};

// Applies the saved/system theme to <html> before paint to avoid a flash.
// Falls back to dark (the brand's primary "Studio" palette).
const THEME_INIT = `(function(){try{var t=localStorage.getItem('seshn:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
