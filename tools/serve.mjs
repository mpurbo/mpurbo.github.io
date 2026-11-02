#!/usr/bin/env node
// Preview the site the way GitHub Pages serves it: a directory URL serves its
// index.html, and a missing path serves 404.html. Zero dependencies.
//   node tools/serve.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 4000);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".xml": "application/xml",
};

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let p = normalize(join(ROOT, url));
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const s = await stat(p);
    if (s.isDirectory()) {
      if (!url.endsWith("/")) { res.writeHead(301, { Location: `${url}/` }).end(); return; }
      p = join(p, "index.html");
    }
    const body = await readFile(p);
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" }).end(body);
  } catch {
    const body = await readFile(join(ROOT, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "Content-Type": TYPES[".html"] }).end(body);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}/`));
