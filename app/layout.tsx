import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monday Recap",
  description: "Drop last week's exports. Get the owner message.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
