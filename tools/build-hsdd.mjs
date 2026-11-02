#!/usr/bin/env node
// Builds mpurbo.github.io/hsdd/ from a checkout of github.com/mpurbo/hsdd.
//
//   node tools/build-hsdd.mjs [--src ../hsdd] [--ref main]
//
// The repository stays the single source: every page here is rendered from
// its markdown or copied from its HTML. hsdd/ is generated output; never edit
// it by hand. Links between documents keep working because each one is
// resolved against the repository and pointed at the published page, or at
// GitHub when the site does not publish the target (code, templates, runs).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { renderMarkdown, takeTitle, esc } from "./lib/markdown.mjs";
import { makeResolver, relativeUrl, GITHUB } from "./lib/links.mjs";
import { shell, tocHtml, docHead } from "./lib/layout.mjs";
import { readSkills, readCommands, readGuideData, readTutorials, specInfo } from "./lib/sources.mjs";
import { homePage, referencePage, tutorialIndexPage, specIndexPage } from "./lib/pages.mjs";
import { checkSite } from "./lib/check.mjs";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const SRC = resolve(SITE, args.src || "../hsdd");
const REF = args.ref || "main";
const OUT = join(SITE, "hsdd");

if (!existsSync(join(SRC, "spec")) || !existsSync(join(SRC, "skills"))) {
  console.error(`not an hsdd checkout: ${SRC}`);
  process.exit(1);
}

const git = (...a) => execFileSync("git", ["-C", SRC, ...a], { encoding: "utf8" }).trim();
const build = {
  sha: git("rev-parse", "HEAD"),
  short: git("rev-parse", "--short", "HEAD"),
  date: git("log", "-1", "--format=%cs"),
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  dirty: git("status", "--porcelain").length > 0,
};

// ------------------------------------------------------------ what is published
const SPECS = [
  { file: "hsdd-spec-v0_10.md", slug: "v0.10", label: "v0.10" },
  { file: "hsdd-spec-v0_11.md", slug: "v0.11", label: "v0.11 delta" },
];
const TUTORIALS = readTutorials(SRC);

const published = new Map([
  ["README.md", "hsdd/index.html"],
  ["docs/users-guide.md", "hsdd/users-guide/index.html"],
  ["CHANGELOG.md", "hsdd/changelog/index.html"],
  ["docs/guide/index.html", "hsdd/guide/index.html"],
  ["docs/tutorial/README.md", "hsdd/tutorial/index.html"],
  ...SPECS.map((s) => [`spec/${s.file}`, `hsdd/spec/${s.slug}/index.html`]),
  ...TUTORIALS.flatMap(({ slug }) => [
    [`docs/tutorial/${slug}/README.md`, `hsdd/tutorial/${slug}/index.html`],
    [`docs/tutorial/${slug}/walkthrough/index.html`, `hsdd/tutorial/${slug}/walkthrough/index.html`],
    [`docs/tutorial/${slug}/walkthrough/process-log.md`, `hsdd/tutorial/${slug}/walkthrough/process-log.html`],
  ]),
]);

const warnings = [];
const resolver = makeResolver({ srcRoot: SRC, published, ref: REF, warn: (w) => warnings.push(w) });
const read = (p) => readFileSync(join(SRC, p), "utf8");
const write = (out, html) => {
  const p = join(SITE, out);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, html);
};
const ghBlob = (p) => `${GITHUB}/blob/${REF}/${p}`;
const ghTree = (p) => `${GITHUB}/tree/${REF}/${p}`;

// ------------------------------------------------------------ clean + assets
if (relative(SITE, OUT) !== "hsdd") throw new Error("refusing to clean outside the site");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "assets/vendor"), { recursive: true });
cpSync(join(SITE, "tools/assets/docs.css"), join(OUT, "assets/docs.css"));
cpSync(join(SITE, "tools/assets/docs.js"), join(OUT, "assets/docs.js"));
cpSync(join(SITE, "node_modules/mermaid/dist/mermaid.min.js"), join(OUT, "assets/vendor/mermaid.min.js"));
cpSync(join(SITE, "node_modules/mermaid/LICENSE"), join(OUT, "assets/vendor/mermaid.LICENSE.txt"));

// ------------------------------------------------------------ markdown pages
function docPage({ repo, out, eyebrow, title, description, active, tocDepth = 3, lede = "", extra = "", tocFoot = "", foot = "" }) {
  const md = read(repo);
  const r = renderMarkdown(md, { resolve: resolver(repo, out) });
  const { titleHtml, body } = takeTitle(r.html);
  const head = docHead({
    eyebrow, titleHtml: title ? esc(title) : titleHtml, lede, extra,
    source: `Source: <a href="${ghBlob(repo)}"><code>${esc(repo)}</code></a> on GitHub`,
  });
  const html = shell({
    out, active, build, hasMermaid: r.hasMermaid,
    title: `${title || r.headings.find((h) => h.depth === 1)?.text || repo} · HSDD`,
    description,
    toc: tocHtml(r.headings, { depth: tocDepth }),
    tocFoot,
    body: `${head}
    <article class="prose">${body}</article>
    <footer class="doc-foot"><span>${foot || `Edit or comment on <a href="${ghBlob(repo)}">GitHub</a>.`}</span><a href="#main">Back to top ↑</a></footer>`,
  });
  write(out, html);
  return r;
}

const ug = docPage({
  repo: "docs/users-guide.md", out: "hsdd/users-guide/index.html", active: "users-guide",
  eyebrow: "User's guide", title: "HSDD User's Guide",
  description: "HSDD on three worked examples, prompt by prompt, then running the project: checkpoints, milestones, unattended runs, and what to do when a project drifts outside the method.",
  tocFoot: `<a href="../guide/">Interactive guide →</a><a href="../tutorial/">Tutorials →</a><a href="../reference/">Skills and glossary →</a>`,
});

docPage({
  repo: "CHANGELOG.md", out: "hsdd/changelog/index.html", active: "reference", tocDepth: 2,
  eyebrow: "Reference", title: "Changelog",
  description: "Every HSDD release: what was added, changed and fixed, and how to upgrade a project in flight.",
});

const specPages = SPECS.map((s) => {
  const info = specInfo(SRC, s.file);
  const r = docPage({
    repo: `spec/${s.file}`, out: `hsdd/spec/${s.slug}/index.html`, active: "reference", tocDepth: 2,
    eyebrow: `Specification · ${s.label}`,
    description: `${info.title}. Version ${info.version}.`,
    extra: `<ul class="chips"><li class="chip flow">Version ${esc(info.version)}</li>${info.status ? `<li class="chip">${esc(info.status)}</li>` : ""}${info.date ? `<li class="chip">${esc(info.date)}</li>` : ""}</ul>`,
  });
  return { ...s, info, chapters: r.headings.filter((h) => h.depth === 2) };
});

const tutorialPages = TUTORIALS.map((t) => {
  const base = `docs/tutorial/${t.slug}`;
  const out = `hsdd/tutorial/${t.slug}/index.html`;
  const extra = `<div class="cta-row">
        <a class="btn primary" href="walkthrough/">Open the walkthrough →</a>
        <a class="btn" href="walkthrough/process-log.html">Read the process log</a>
        <a class="btn" href="${ghTree(base)}">Files on GitHub</a>
      </div>`;
  const r = docPage({
    repo: `${base}/README.md`, out, active: "tutorial",
    eyebrow: `Tutorial ${t.num} of ${TUTORIALS.length}`, extra,
    description: textOnly(t.shows),
    foot: `<a href="../">All tutorials</a> · <a href="${ghTree(base)}">this tutorial on GitHub</a>`,
  });
  docPage({
    repo: `${base}/walkthrough/process-log.md`, out: `hsdd/tutorial/${t.slug}/walkthrough/process-log.html`, active: "tutorial",
    eyebrow: `Tutorial ${t.num} · ${esc(t.title)} · process log`,
    description: `The full written record of the ${t.title} tutorial run: every step, every decision taken on the owner's behalf, every failure, and the findings about HSDD.`,
    extra: `<div class="cta-row"><a class="btn" href="./">← Walkthrough</a><a class="btn" href="../">Tutorial overview</a></div>`,
    foot: `<a href="../">Back to the ${esc(t.title)} tutorial</a>`,
  });
  return { ...t, headings: r.headings };
});

function textOnly(md) { return md.replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); }

// ------------------------------------------------------------ designed pages
const skills = readSkills(SRC);
const commands = readCommands(SRC);
const guideData = readGuideData(SRC);
const inline = (md) => marked.parseInline(md);
// The newest changelog entry, and whether it carries a release date.
const release = (() => {
  const m = /^## \[(\d+\.\d+\.\d+)\] - (.+)$/m.exec(read("CHANGELOG.md"));
  if (!m) throw new Error("CHANGELOG.md has no version entry");
  return { version: m[1], date: /^\d{4}-\d{2}-\d{2}/.test(m[2]) ? m[2].slice(0, 10) : null };
})();
const ctx = { release, build, skills, commands, guide: guideData, specs: specPages, tutorials: tutorialPages, inline, ghBlob, ghTree };

write("hsdd/index.html", homePage({ ...ctx, out: "hsdd/index.html", shell }));
write("hsdd/reference/index.html", referencePage({ ...ctx, out: "hsdd/reference/index.html", shell, tocHtml }));
write("hsdd/tutorial/index.html", tutorialIndexPage({ ...ctx, out: "hsdd/tutorial/index.html", shell, readme: read("docs/tutorial/README.md"), resolve: resolver("docs/tutorial/README.md", "hsdd/tutorial/index.html") }));
write("hsdd/spec/index.html", specIndexPage({ ...ctx, out: "hsdd/spec/index.html", shell }));

// ------------------------------------------------------------ copied pages
// A link back to the docs, in the guide's own top-bar style, for pages that
// were built to stand alone.
const BACK_STYLE = (hideBelow) => `<style>.site-back{text-decoration:none;color:inherit;white-space:nowrap;flex:none}.site-back span+span{margin-left:2px}@media (max-width:640px){.site-back .site-back-label{display:none}.site-back{width:32px;padding:0}}${hideBelow ? `@media (max-width:${hideBelow}px){.site-back{display:none}}` : ""}</style>`;
const backLink = (href, label, title) =>
  `<a class="tool site-back" href="${href}" title="${title}"><span aria-hidden="true">←</span><span class="site-back-label">${label}</span></a>`;

function replaceOnce(text, from, to, where) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${where}: expected one "${from}", found ${n}`);
  return text.replace(from, to);
}
function injectBack(html, href, label, title, where, hideBelow = 0) {
  html = replaceOnce(html, "</head>", `  ${BACK_STYLE(hideBelow)}\n</head>`, where);
  return replaceOnce(html, '<header class="topbar">', `<header class="topbar">\n    ${backLink(href, label, title)}`, where);
}

// The interactive guide: its three link constants point into the repository.
{
  const from = join(SRC, "docs/guide"), to = join(OUT, "guide");
  mkdirSync(to, { recursive: true });
  cpSync(join(from, "guide.css"), join(to, "guide.css"));
  let js = readFileSync(join(from, "guide.js"), "utf8");
  js = replaceOnce(js, 'const SPEC = "../../spec/hsdd-spec-v0_10.md";', 'const SPEC = "../spec/v0.10/";', "guide.js");
  js = replaceOnce(js, 'const SPEC11 = "../../spec/hsdd-spec-v0_11.md";', 'const SPEC11 = "../spec/v0.11/";', "guide.js");
  js = replaceOnce(js, 'const UG = "../users-guide.md";', 'const UG = "../users-guide/";', "guide.js");
  writeFileSync(join(to, "guide.js"), js);
  let html = readFileSync(join(from, "index.html"), "utf8");
  html = replaceOnce(html, 'href="../users-guide.md"', 'href="../users-guide/"', "guide index.html");
  html = injectBack(html, "../", "Docs", "All HSDD documentation", "guide index.html");
  writeFileSync(join(to, "index.html"), html);
}

// The walkthroughs: the page and its scripts and styles, the screenshots the
// page reads from beside it, and the process log as a rendered page.
for (const t of TUTORIALS) {
  const from = join(SRC, `docs/tutorial/${t.slug}/walkthrough`), to = join(OUT, `tutorial/${t.slug}/walkthrough`);
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) {
    const p = join(from, f);
    if (statSync(p).isDirectory()) { cpSync(p, join(to, f), { recursive: true }); continue; }
    if (/\.(js|css)$/.test(f) && !f.endsWith(".mjs")) cpSync(p, join(to, f));
  }
  let html = readFileSync(join(from, "index.html"), "utf8");
  html = replaceOnce(html, 'href="process-log.md"', 'href="process-log.html"', `${t.slug} walkthrough`);
  html = injectBack(html, "../../", "Tutorials", "All HSDD tutorials", `${t.slug} walkthrough`, 480);
  writeFileSync(join(to, "index.html"), html);
  // Evidence screenshots that the page loads from ../execute/.
  const js = readdirSync(from).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(from, f), "utf8")).join("\n");
  const ev = /const EVIDENCE = "([^"]+)"/.exec(js)?.[1];
  if (ev) {
    const src = join(SRC, `docs/tutorial/${t.slug}/execute`, ev);
    cpSync(src, join(OUT, `tutorial/${t.slug}/execute`, ev), { recursive: true, filter: (p) => statSync(p).isDirectory() || /\.(png|jpe?g|gif|webp|svg)$/i.test(p) });
  }
}

// ------------------------------------------------------------ check
const problems = checkSite({ site: SITE, root: "hsdd", src: SRC, guideJs: join(OUT, "guide/guide.js") });
writeFileSync(join(OUT, "BUILD.txt"), `Generated by tools/build-hsdd.mjs. Do not edit files under hsdd/ by hand.\nSource: ${GITHUB} @ ${build.sha} (${build.branch}${build.dirty ? ", with uncommitted changes" : ""}), ${build.date}\n`);

for (const w of warnings) console.warn(`warn: ${w}`);
for (const p of problems) console.error(`broken: ${p}`);
console.log(`built hsdd/ from ${build.short} (${build.branch}${build.dirty ? ", dirty" : ""}): ${ug.headings.length} user's guide headings, ${skills.length} skills, ${TUTORIALS.length} tutorials, ${warnings.length} warnings, ${problems.length} broken links`);
if (problems.length) process.exit(2);
