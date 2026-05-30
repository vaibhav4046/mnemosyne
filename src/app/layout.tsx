import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Own Wiki — Personal Knowledge OS",
  description:
    "Local-first self-improving AI memory wiki powered by Ollama. RAG, multi-step browser agents, swarm intelligence, MCP — all on your machine.",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem('ow.theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
