import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Crypto Value Screener",
  description: "A crypto value screener for live RSI and weekly breakout scans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <Navbar />
          <main className="content-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
