"use client";

import { usePathname } from "next/navigation";
import DawBar from "@/components/landing/DawBar";
import Footer from "@/components/landing/Footer";
import "./marketing.css";

// Marketing route group: always-dark "Studio" chrome (scoped under .daw-site so
// it's isolated from the app's themeable tokens). The DAW bar's active link +
// home-only transport are derived from the path.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const home = path === "/";
  const active = home ? "" : path.slice(1).split("/")[0];
  return (
    <div className="daw-site">
      <DawBar active={active} home={home} />
      {children}
      <Footer />
    </div>
  );
}
