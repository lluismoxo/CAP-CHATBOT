import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAP Consultor — Asistente",
  description: "Chatbot de CAP Consultoría Adaptativa para Pymes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
