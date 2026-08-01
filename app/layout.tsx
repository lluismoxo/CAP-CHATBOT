import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAP — Adaptive Consulting for Small Businesses · Assistant",
  description: "Virtual assistant for CAP — Adaptive Consulting for Small Businesses. AI automation, chatbots, lead generation and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
