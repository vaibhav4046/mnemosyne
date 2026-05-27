import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mnemosyne — Personal Knowledge OS",
  description: "Local-first AI memory wiki powered by Ollama. RAG, multi-agent swarms, browser automation, MCP — all on your machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
