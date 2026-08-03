import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAP Consultoría Adaptativa Pymes — Asistente",
  description: "Asistente virtual de CAP Consultoría Adaptativa Pymes. Automatización con IA, chatbots, lead generation y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
