// The page shell shared by every generated HSDD page: the top bar, the
// optional on-page contents, the footer. Pure: values in, an HTML string out.
import { esc } from "./markdown.mjs";
import { relativeUrl, GITHUB } from "./links.mjs";

export const MARK = `<svg class="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M14 7 L7 14 M14 7 L21 14 M7 14 L4 21 M7 14 L10 21 M21 14 L21 21" />
        <rect x="10" y="3" width="8" height="6" rx="1.5" class="m-root" />
        <rect x="3" y="11" width="8" height="6" rx="1.5" class="m-node" />
        <rect x="17" y="11" width="8" height="6" rx="1.5" class="m-node" />
        <rect x="1" y="20" width="6" height="5" rx="1.5" class="m-leaf" />
        <rect x="8" y="20" width="6" height="5" rx="1.5" class="m-leaf" />
        <rect x="18" y="20" width="6" height="5" rx="1.5" class="m-leaf" />
      </svg>`;

// The guide's favicon, so a browser tab reads as the same family.
export const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Cpath d='M14 7L7 14M14 7L21 14M7 14L4 21M7 14L10 21M21 14L21 21' fill='none' stroke='%23475569' stroke-width='1.6'/%3E%3Crect x='10' y='3' width='8' height='6' rx='1.5' fill='%23e0e7ff' stroke='%234f46e5'/%3E%3Crect x='3' y='11' width='8' height='6' rx='1.5' fill='%23f3e8ff' stroke='%237c3aed'/%3E%3Crect x='17' y='11' width='8' height='6' rx='1.5' fill='%23f3e8ff' stroke='%237c3aed'/%3E%3Crect x='1' y='20' width='6' height='5' rx='1.5' fill='%23d1fae5' stroke='%23059669'/%3E%3Crect x='8' y='20' width='6' height='5' rx='1.5' fill='%23d1fae5' stroke='%23059669'/%3E%3Crect x='18' y='20' width='6' height='5' rx='1.5' fill='%23d1fae5' stroke='%23059669'/%3E%3C/svg%3E";

const GH_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

// Before first paint: the stored theme, shared with the interactive guide.
const THEME_BOOT = `<script>try{var t=JSON.parse(localStorage.getItem("hsdd-guide")||"{}").theme;if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}document.documentElement.classList.add("js")</script>`;

const NAV = [
  ["guide", "guide/index.html", "Interactive guide"],
  ["users-guide", "users-guide/index.html", "User's guide"],
  ["tutorial", "tutorial/index.html", "Tutorials"],
  ["reference", "reference/index.html", "Reference"],
];

export function tocHtml(headings, { depth = 3, label = "On this page" } = {}) {
  const items = [];
  for (const h of headings) {
    if (h.depth === 2) items.push({ h, kids: [] });
    else if (h.depth === 3 && depth >= 3 && items.length) items[items.length - 1].kids.push(h);
  }
  if (!items.length) return "";
  const link = (h) => `<a href="#${h.id}" data-id="${h.id}">${esc(h.text)}</a>`;
  return `<p class="toc-label">${esc(label)}</p><ol class="toc-list">${items
    .map(({ h, kids }) => `<li>${link(h)}${kids.length ? `<ol>${kids.map((k) => `<li>${link(k)}</li>`).join("")}</ol>` : ""}</li>`)
    .join("")}</ol>`;
}

export function shell({ out, title, description, body, active = "", toc = "", tocFoot = "", hasMermaid = false, build, kind = "doc" }) {
  const base = relativeUrl(out, "hsdd/index.html");
  const root = relativeUrl(out, "index.html");
  const nav = NAV.map(([id, href, label]) =>
    `<a href="${relativeUrl(out, `hsdd/${href}`)}"${active === id ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const scripts = [
    hasMermaid ? `<script src="${base}assets/vendor/mermaid.min.js" defer></script>` : "",
    `<script src="${base}assets/docs.js" defer></script>`,
  ].join("\n  ");
  const shellBody = toc
    ? `<div class="shell has-toc">
    <nav class="toc" id="toc" aria-label="On this page">${toc}${tocFoot ? `<div class="toc-foot">${tocFoot}</div>` : ""}</nav>
    <main id="main" tabindex="-1">${body}</main>
  </div>`
    : `<main id="main" class="page-${kind}" tabindex="-1">${body}</main>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="icon" href="${FAVICON}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  ${THEME_BOOT}
  <link rel="stylesheet" href="${base}assets/docs.css">
  ${scripts}
</head>
<body class="kind-${kind}">
  <a class="skip" href="#main">Skip to the content</a>
  <header class="topbar">
    ${toc ? '<button class="tool contents-toggle" id="contents-toggle" aria-expanded="false" aria-controls="toc">Contents</button>' : ""}
    <a class="brand" href="${base}" aria-label="HSDD documentation home">
      ${MARK}
      <span class="brand-text"><strong>HSDD</strong><span>Hierarchical Spec-Driven Development</span></span>
    </a>
    <nav class="sitenav" id="sitenav" aria-label="HSDD documentation">${nav}</nav>
    <div class="tools">
      <button class="tool menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="sitenav">Menu</button>
      <a class="tool icon" href="${GITHUB}" aria-label="HSDD on GitHub" title="HSDD on GitHub">${GH_ICON}</a>
      <button class="tool icon" id="theme-toggle" title="Theme (T)" aria-label="Theme: follow system">◐</button>
    </div>
  </header>
  ${shellBody}
  <footer class="site-foot">
    <div class="foot-inner">
      <p>HSDD is open source under the <a href="${GITHUB}/blob/main/LICENSE">Apache License 2.0</a>. Built from <a href="${GITHUB}/commit/${build.sha}"><code>mpurbo/hsdd@${build.short}</code></a>, ${esc(build.date)}.</p>
      <p class="foot-links"><a href="${base}changelog/">Changelog</a><a href="${base}spec/">Specification</a><a href="${GITHUB}">GitHub</a><a href="${root}">Purbo Mohamad</a></p>
    </div>
  </footer>
</body>
</html>
`;
}

// The header block of a document page: eyebrow, title, lede, source line.
export function docHead({ eyebrow, titleHtml, lede = "", source = "", extra = "" }) {
  return `<header class="doc-head">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
      <h1>${titleHtml}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ""}
      ${extra}
      ${source ? `<p class="source">${source}</p>` : ""}
    </header>`;
}
