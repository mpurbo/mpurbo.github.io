// After a build: every relative href and src in the generated pages must
// reach a file, and every #anchor into a generated page must name an id on
// it. The interactive guide builds its links in script, so its spec and
// user's-guide anchors are read out of guide.js and checked the same way.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, posix } from "node:path";

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

export function checkSite({ site, root, guideJs }) {
  const problems = [];
  const base = join(site, root);
  const ids = new Map();
  const idsOf = (file) => {
    if (!ids.has(file)) {
      const html = readFileSync(file, "utf8");
      ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    }
    return ids.get(file);
  };
  const target = (fromFile, url) => {
    let p = join(dirname(fromFile), decodeURIComponent(url));
    if (url.endsWith("/") || (existsSync(p) && statSync(p).isDirectory())) p = join(p, "index.html");
    return p;
  };
  // Pages the generator wrote; the copied walkthrough and guide scripts build
  // most of their links at run time and are checked by their own sources.
  const pages = walk(base).filter((f) => f.endsWith(".html"));
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const rel = relative(site, file);
    for (const [, attr, url] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
      if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(url)) continue;
      const [path, hash] = url.split("#");
      const to = path ? target(file, path) : file;
      if (!existsSync(to)) { problems.push(`${rel}: ${attr}="${url}" (no ${relative(site, to)})`); continue; }
      // The guide and the walkthroughs route by hash in script (#tree-1, #start).
      const routed = /(^|\/)(guide|walkthrough)\/index\.html$/.test(to);
      if (hash && to.endsWith(".html") && !routed && !idsOf(to).has(decodeURIComponent(hash))) {
        problems.push(`${rel}: ${attr}="${url}" (no #${hash} on ${relative(site, to)})`);
      }
    }
  }
  // The guide's links: SPEC, SPEC11 and UG constants plus anchors.
  if (guideJs && existsSync(guideJs)) {
    const js = readFileSync(guideJs, "utf8");
    const consts = Object.fromEntries([...js.matchAll(/const (SPEC|SPEC11|UG) = "([^"]+)";/g)].map((m) => [m[1], m[2]]));
    const fn = { spec: consts.SPEC, spec11: consts.SPEC11, guide: consts.UG };
    for (const [, f, anchor] of js.matchAll(/\b(spec|spec11|guide)\("[^"]*", "([^"]+)"\)/g)) {
      const to = target(guideJs, fn[f]);
      if (!existsSync(to)) { problems.push(`guide.js ${f}(): no ${relative(site, to)}`); continue; }
      if (!idsOf(to).has(anchor)) problems.push(`guide.js ${f}("…", "${anchor}"): no such anchor on ${relative(site, to)}`);
    }
    for (const m of js.matchAll(/\$\{(SPEC|SPEC11|UG)\}#([a-z0-9-]+)/g)) {
      const to = target(guideJs, consts[m[1]]);
      if (existsSync(to) && !idsOf(to).has(m[2])) problems.push(`guide.js \${${m[1]}}#${m[2]}: no such anchor`);
    }
  }
  return problems;
}
