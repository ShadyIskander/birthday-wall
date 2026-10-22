import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = { title: "Birthday photos" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={caveat.className}>{children}</body>
    </html>
  );
}
