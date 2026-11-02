// Markdown to HTML for the HSDD pages. Pure: a document's text and a link
// resolver in, its HTML, headings and flags out. Heading ids follow GitHub's
// algorithm, so an anchor that works on github.com works here too.
import { Marked } from "marked";

export const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[e]));

export const textOf = (html) => decode(String(html).replace(/<[^>]+>/g, "")).trim();

// github-slugger: lower-case, drop everything but letters, marks, numbers,
// connector punctuation, hyphens and spaces, spaces to hyphens, and number
// repeats in document order.
export function slugger() {
  const seen = Object.create(null);
  return (text) => {
    const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "").replace(/ /g, "-");
    let slug = base;
    while (slug in seen) {
      seen[base] += 1;
      slug = `${base}-${seen[base]}`;
    }
    seen[slug] = 0;
    return slug;
  };
}

// A paragraph that opens with "*In the interactive guide:*" becomes a row of
// chapter links; the user's guide uses it at the top of each major section.
const XREF = /<p><em>In the interactive guide:<\/em>\s*([\s\S]*?)<\/p>/g;

// Consecutive "**Field:** value" lines, such as a spec's header, keep their
// line breaks as they read in an editor. Code fences are left alone.
function keepFieldBreaks(md) {
  const lines = md.split("\n");
  const FIELD = /^\*\*[^*\n]{1,40}:\*\*/;
  let fence = "";
  for (let i = 0; i < lines.length - 1; i++) {
    const f = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
    if (f) { if (!fence) fence = f[1]; else if (f[1].startsWith(fence)) fence = ""; continue; }
    if (!fence && lines[i].trim() && FIELD.test(lines[i + 1])) lines[i] = lines[i].replace(/\s*$/, "  ");
  }
  return lines.join("\n");
}

export function renderMarkdown(text, { resolve = (h) => h }) {
  const slug = slugger();
  const headings = [];
  let hasMermaid = false;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const plain = textOf(inner);
        const id = slug(plain);
        headings.push({ depth, id, html: inner, text: plain });
        if (depth === 1) return `<h1 id="${id}">${inner}</h1>\n`;
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text: code, lang }) {
        const l = (lang || "").trim().split(/\s+/)[0].toLowerCase();
        if (l === "mermaid") {
          hasMermaid = true;
          return `<figure class="diagram"><pre class="mermaid">${esc(code)}</pre></figure>\n`;
        }
        const prompt = (!l || l === "text") && /^\s*You:/.test(code);
        const label = prompt ? "prompt" : l || "text";
        return `<div class="code${prompt ? " is-prompt" : ""}"><div class="code-tab"><span>${esc(label)}</span>`
          + `<button class="copy" type="button" aria-label="Copy this block">Copy</button></div>`
          + `<pre><code${l ? ` class="language-${esc(l)}"` : ""}>${esc(code.replace(/\n$/, ""))}</code></pre></div>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const target = resolve(href);
        const ext = /^https?:\/\//.test(target);
        return `<a href="${esc(target)}"${title ? ` title="${esc(title)}"` : ""}${ext ? ' rel="noopener"' : ""}>${inner}</a>`;
      },
      image({ href, title, text: alt }) {
        return `<img src="${esc(resolve(href, { image: true }))}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
      },
    },
  });
  let html = marked.parse(keepFieldBreaks(text));
  html = html
    .replace(/<table>/g, '<div class="tbl-wrap"><table class="tbl">')
    .replace(/<\/table>/g, "</table></div>")
    .replace(XREF, (_, links) => `<p class="xref"><span class="xref-label">In the interactive guide</span>${links.replace(/\s*·\s*/g, " ")}</p>`);
  return { html, headings, hasMermaid };
}

// Split off the first h1, so the page header can carry it.
export function takeTitle(html) {
  const m = /<h1 id="[^"]*">([\s\S]*?)<\/h1>\n?/.exec(html);
  if (!m) return { titleHtml: "", body: html };
  return { titleHtml: m[1], body: html.slice(0, m.index) + html.slice(m.index + m[0].length) };
}
