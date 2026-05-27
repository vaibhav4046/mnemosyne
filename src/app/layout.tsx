import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Own Wiki — Personal Knowledge OS",
  description: "Local-first self-improving AI memory wiki powered by Ollama. RAG, multi-step browser agents, swarm intelligence, MCP — all on your machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
