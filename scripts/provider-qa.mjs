// Provider-layer QA — exercises the multi-engine AI backbone + key handling.
const B = process.env.BASE || "http://127.0.0.1:3789";
const H = { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" };
let pass = 0, fail = 0;
const F = [];
const ok = (n, c) => { if (c) { pass++; } else { fail++; F.push(n); } };

async function j(path, init) {
  const r = await fetch(B + path, init);
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body };
}

(async () => {
  // providers status shape
  let r = await j("/api/providers");
  ok("providers GET 200", r.status === 200);
  ok("providers has settings", !!r.body?.settings);
  ok("providers has status.reachable", !!r.body?.status?.reachable);
  ok("defaultModels present (4 engines)", r.body?.defaultModels && Object.keys(r.body.defaultModels).length === 4);

  // models route reflects provider
  r = await j("/api/models");
  ok("models GET 200", r.status === 200);
  ok("models reports provider", typeof r.body?.provider === "string");
  ok("models reports reachable map", !!r.body?.reachable);

  // save a fake key → must be masked, never echoed raw
  const FAKE = "gsk_test_SUPERSECRET_DO_NOT_LEAK_1234";
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "save", keys: { groq: FAKE } }) });
  ok("save key 200", r.status === 200);
  const groqMask = r.body?.settings?.keys?.groq || "";
  ok("key masked in response", groqMask.includes("•") && !groqMask.includes("SUPERSECRET"));
  ok("groq now configured", r.body?.settings?.configured?.groq === true);

  // GET again — still masked, raw secret never present anywhere
  r = await j("/api/providers");
  const blob = JSON.stringify(r.body);
  ok("raw secret never leaks", !blob.includes("SUPERSECRET"));

  // saving with masked placeholder must NOT overwrite the stored key
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "save", keys: { groq: "••••••••1234" } }) });
  ok("masked placeholder ignored (still configured)", r.body?.settings?.configured?.groq === true);

  // switch active provider
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "save", provider: "ollama" }) });
  ok("switch provider 200", r.status === 200 && r.body?.settings?.provider === "ollama");

  // test a configured-but-bogus key → ok:false with error, no crash
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "test", provider: "groq" }) });
  ok("test bogus key returns ok:false", r.status === 200 && r.body?.ok === false);

  // test ollama (real) → ok:true if models present
  const models = (await j("/api/models")).body?.models || [];
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "test", provider: "ollama" }) });
  ok("test ollama ok", models.length === 0 || r.body?.ok === true);

  // clear the fake key → no longer configured
  r = await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "clearKey", provider: "groq" }) });
  ok("clearKey 200", r.status === 200 && r.body?.settings?.configured?.groq === false);

  // invalid actions / inputs
  ok("unknown action 400", (await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "frobnicate" }) })).status === 400);
  ok("test invalid provider 400", (await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "test", provider: "skynet" }) })).status === 400);
  ok("clearKey ollama rejected 400", (await j("/api/providers", { method: "POST", headers: H, body: JSON.stringify({ action: "clearKey", provider: "ollama" }) })).status === 400);

  // CSRF: cross-site POST to providers must be blocked
  const x = await fetch(B + "/api/providers", { method: "POST", headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" }, body: JSON.stringify({ action: "save", keys: { groq: "evil" } }) });
  ok("CSRF blocks providers POST (403)", x.status === 403);

  // chat still streams through provider chain (ollama)
  if (models.length > 0) {
    const cr = await fetch(B + "/api/chat", { method: "POST", headers: H, body: JSON.stringify({ messages: [{ role: "user", content: "say hi" }], useRag: false }) });
    const rd = cr.body.getReader(); const dec = new TextDecoder(); let acc = "";
    while (true) { const { value, done } = await rd.read(); if (done) break; for (const ln of dec.decode(value).split("\n\n")) { if (ln.startsWith("data: ")) { try { const ev = JSON.parse(ln.slice(6)); if (ev.type === "token") acc += ev.text; } catch {} } } }
    ok("chat streams via provider", acc.length > 0);
  } else {
    ok("chat streams via provider (skipped: no ollama)", true);
  }

  console.log(`=== PROVIDER QA PASS=${pass} FAIL=${fail} ===`);
  F.forEach((x) => console.log("FAIL: " + x));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(2); });
