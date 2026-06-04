import { NextRequest } from "next/server";
import { getPage, listPages } from "@/lib/wiki";
import { validSlug, err } from "@/lib/validate";

export const runtime = "nodejs";

async function pageToHtml(slug: string, body: string, title: string) {
  const { marked } = await import("marked").catch(() => ({ marked: null })) as { marked: ((s: string) => string) | null };
  const html = marked
    ? marked(body)
    : body
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/\n\n/g, "<br><br>");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:'Inter Tight',sans-serif;color:#222;max-width:780px;margin:48px auto;padding:0 24px;line-height:1.65;background:#fff;}
h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:500;letter-spacing:-0.01em;margin:1.4em 0 .5em;}
h1{font-size:34px;border-bottom:1px solid #ddd;padding-bottom:8px;}
code{background:#f4f4f6;padding:2px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#6d28d9;}
blockquote{border-left:3px solid #a855f7;padding:4px 14px;color:#555;font-style:italic;margin:14px 0;}
pre{background:#f4f4f6;padding:12px;border-radius:6px;overflow-x:auto;}
a{color:#6d28d9;}
hr{border:0;border-top:1px solid #eee;margin:24px 0;}
.meta{font-size:12px;color:#888;font-family:'JetBrains Mono',monospace;margin-bottom:32px;}
</style></head><body>
<div class="meta">Own Wiki · ${slug} · exported ${new Date().toISOString().slice(0, 10)}</div>
<h1>${title}</h1>
${html}
</body></html>`;
}

function bodyToCsv(slug: string, title: string, body: string) {
  const linkRe = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(body))) links.push(m[1]);
  const sections: { heading: string; chars: number }[] = [];
  const lines = body.split("\n");
  let cur: { heading: string; chars: number } | null = null;
  for (const l of lines) {
    const h = /^##\s+(.+)$/.exec(l);
    if (h) {
      if (cur) sections.push(cur);
      cur = { heading: h[1], chars: 0 };
    } else if (cur) {
      cur.chars += l.length;
    }
  }
  if (cur) sections.push(cur);
  const rows = [
    ["field", "value"],
    ["slug", slug],
    ["title", title],
    ["chars", String(body.length)],
    ["links", links.join("|")],
    ["sections", String(sections.length)],
    ...sections.map((s, i) => [`section_${i + 1}_heading`, s.heading]),
    ...sections.map((s, i) => [`section_${i + 1}_chars`, String(s.chars)]),
  ];
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

async function buildDocx(body: string, title: string) {
  const docx = await import("docx").catch(() => null);
  if (!docx) throw new Error("docx not installed");
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx;
  const paragraphs: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];
  const lines = body.split("\n");
  for (const l of lines) {
    if (/^##\s+/.test(l)) paragraphs.push(new Paragraph({ text: l.replace(/^##\s+/, ""), heading: HeadingLevel.HEADING_2 }));
    else if (/^#\s+/.test(l)) paragraphs.push(new Paragraph({ text: l.replace(/^#\s+/, ""), heading: HeadingLevel.HEADING_1 }));
    else if (/^-\s+/.test(l)) paragraphs.push(new Paragraph({ text: l.replace(/^-\s+/, ""), bullet: { level: 0 } }));
    else if (/^>\s+/.test(l)) paragraphs.push(new Paragraph({ children: [new TextRun({ text: l.replace(/^>\s+/, ""), italics: true })] }));
    else if (l.trim()) paragraphs.push(new Paragraph(l));
    else paragraphs.push(new Paragraph(""));
  }
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

async function buildPdf(html: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buf = await page.pdf({ format: "A4", margin: { top: "20mm", right: "16mm", bottom: "20mm", left: "16mm" } });
    return buf;
  } finally {
    await browser.close();
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!validSlug(slug) && slug !== "all") return err(400, "invalid slug");
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "md").toLowerCase();

  if (slug === "all" && format === "csv") {
    const pages = await listPages();
    const rows = [["slug", "title", "tags", "links", "sources", "chars", "updated"]];
    for (const p of pages) {
      rows.push([p.slug, p.title, p.tags.join("|"), p.links.join("|"), p.sources.join("|"), String(p.body.length), p.updated]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="own-wiki-index.csv"`,
      },
    });
  }

  const page = await getPage(slug);
  if (!page) return err(404, "page not found");

  if (format === "md") {
    return new Response(page.raw, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.md"`,
      },
    });
  }
  if (format === "csv") {
    const csv = bodyToCsv(slug, page.title, page.body);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.csv"`,
      },
    });
  }
  if (format === "pdf") {
    const html = await pageToHtml(slug, page.body, page.title);
    const buf = await buildPdf(html);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      },
    });
  }
  if (format === "docx") {
    try {
      const buf = await buildDocx(page.body, page.title);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${slug}.docx"`,
        },
      });
    } catch (e) {
      return err(500, e instanceof Error ? e.message : "docx failed");
    }
  }
  if (format === "html") {
    const html = await pageToHtml(slug, page.body, page.title);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.html"`,
      },
    });
  }
  return err(400, "unknown format");
}
