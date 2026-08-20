import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPass Escrow",
  description: "GenLayer adjudicated escrow for safer event ticket transfers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
