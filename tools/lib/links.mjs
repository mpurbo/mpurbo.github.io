// Link resolution. Every document is written for the repository, with links
// relative to its own path. A link whose target the site publishes points at
// the published page; any other target in the repository points at GitHub.
import { existsSync, statSync } from "node:fs";
import { posix, join } from "node:path";

export const GITHUB = "https://github.com/mpurbo/hsdd";
const RAW = "https://raw.githubusercontent.com/mpurbo/hsdd";

// The out path of a page, as a URL a browser asks for: ".../index.html" -> ".../".
const pretty = (p) => p.replace(/(^|\/)index\.html$/, "$1");

export function relativeUrl(fromOut, toOut) {
  const from = posix.dirname(fromOut);
  let rel = posix.relative(from, pretty(toOut).replace(/\/$/, "") || ".");
  if (rel === "") rel = ".";
  const isDir = /(^|\/)index\.html$/.test(toOut) || toOut.endsWith("/");
  return isDir ? `${rel}/`.replace(/^\.\/$/, "./") : rel;
}

// published: Map(repo path -> out path), repo paths without a trailing slash.
export function makeResolver({ srcRoot, published, ref = "main", warn = () => {} }) {
  const lookup = (repoPath) => {
    if (published.has(repoPath)) return published.get(repoPath);
    for (const idx of ["README.md", "index.html"]) {
      const k = repoPath ? `${repoPath}/${idx}` : idx;
      if (published.has(k)) return published.get(k);
    }
    return null;
  };
  return (fromRepo, fromOut) => (href, { image = false } = {}) => {
    if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) return href;
    const m = /^([^#?]*)(\?[^#]*)?(#.*)?$/.exec(href);
    const [, path, query = "", hash = ""] = m;
    if (!path) return href;
    let repoPath = posix.normalize(posix.join(posix.dirname(fromRepo), path)).replace(/\/$/, "");
    if (repoPath === ".") repoPath = "";
    if (repoPath.startsWith("..")) { warn(`${fromRepo}: link leaves the repository: ${href}`); return href; }
    const abs = join(srcRoot, repoPath);
    const exists = existsSync(abs);
    const isDir = exists && statSync(abs).isDirectory();
    const out = lookup(repoPath);
    if (out) return relativeUrl(fromOut, out) + hash;
    if (!exists) warn(`${fromRepo}: link to a missing file: ${href}`);
    if (image) return `${RAW}/${ref}/${repoPath}`;
    return `${GITHUB}/${isDir ? "tree" : "blob"}/${ref}/${repoPath}${query}${hash}`;
  };
}
