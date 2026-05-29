import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seshn — find your next collaborator",
  description:
    "Seshn is the collaboration marketplace for musicians. Post a brief, find producers, vocalists, writers and engineers, and make your next record.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
