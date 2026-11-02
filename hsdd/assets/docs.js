/* HSDD documentation pages: theme, menus, copy buttons, the current section
   in the contents, and Mermaid diagrams drawn in the page's own colors.
   Everything here is an enhancement; every page reads fully without it. */
"use strict";
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- theme: shared with the interactive guide, which stores { theme, ... } under this key
  const KEY = "hsdd-guide";
  const THEMES = ["system", "light", "dark"];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
  const write = (patch) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); } catch { /* storage unavailable */ } };
  let theme = THEMES.includes(read().theme) ? read().theme : "system";
  const themeBtn = $("#theme-toggle");
  function applyTheme() {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme);
    if (themeBtn) {
      themeBtn.textContent = theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐";
      themeBtn.setAttribute("aria-label", `Theme: ${theme === "system" ? "follow system" : theme}. Change theme.`);
    }
  }
  applyTheme();
  themeBtn?.addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    write({ theme });
    applyTheme();
  });

  // ---- menus: the site navigation and the contents drawer on narrow screens
  const toggles = [
    [$("#menu-toggle"), $("#sitenav")],
    [$("#contents-toggle"), $("#toc")],
  ].filter(([b, p]) => b && p);
  const closeAll = (except) => toggles.forEach(([b, p]) => { if (p !== except) { p.classList.remove("open"); b.setAttribute("aria-expanded", "false"); } });
  toggles.forEach(([btn, panel]) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !panel.classList.contains("open");
      closeAll(panel);
      panel.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", (e) => { if (e.target.closest("a")) closeAll(); });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".open")) closeAll(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "t" || e.key === "T")) themeBtn?.click();
  });

  // ---- copy buttons on code blocks
  $$(".code .copy").forEach((btn) => btn.addEventListener("click", async () => {
    const text = btn.closest(".code").querySelector("pre").innerText;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied"; btn.classList.add("done");
    } catch {
      btn.textContent = "Select and copy";
    }
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
  }));

  // ---- the current section, marked in the contents
  const toc = $("#toc");
  if (toc) {
    const links = new Map($$("a[data-id]", toc).map((a) => [a.dataset.id, a]));
    const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (heads.length > 24) toc.classList.add("collapse");
    let current = null;
    const mark = (id) => {
      if (id === current) return;
      current = id;
      links.forEach((a) => a.classList.remove("current"));
      $$(".toc-list > li.open", toc).forEach((li) => li.classList.remove("open"));
      const a = links.get(id);
      if (!a) return;
      a.classList.add("current");
      const top = a.closest(".toc-list > li");
      top?.classList.add("open");
      top?.querySelector(":scope > a")?.classList.add("current");
      const r = a.getBoundingClientRect(), t = toc.getBoundingClientRect();
      if (r.top < t.top + 40 || r.bottom > t.bottom - 40) a.scrollIntoView({ block: "nearest" });
    };
    const update = () => {
      const line = 120;
      let id = heads[0]?.id;
      for (const h of heads) { if (h.getBoundingClientRect().top - line <= 0) id = h.id; else break; }
      mark(id);
    };
    let queued = false;
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
    update();
  }

  // ---- Mermaid. The diagrams carry the light pastel palette as literal colors;
  // swapping each for its token makes them follow the theme like the rest of the page.
  const PALETTE = {
    "#e0e7ff": "var(--flow-bg)", "#4f46e5": "var(--flow)",
    "#f3e8ff": "var(--process-bg)", "#7c3aed": "var(--process)",
    "#dbeafe": "var(--impl-bg)", "#2563eb": "var(--impl)",
    "#d1fae5": "var(--done-bg)", "#059669": "var(--done)", "#047857": "var(--done)",
    "#fef3c7": "var(--decision-bg)", "#d97706": "var(--decision)", "#b45309": "var(--decision)",
    "#1e293b": "var(--ink)", "#475569": "var(--line)", "#ffffff": "var(--card)", "#fff": "var(--card)",
  };
  const remap = (svg) => svg.replace(/#[0-9a-f]{6}\b|#fff\b/gi, (hex) => PALETTE[hex.toLowerCase()] || hex);

  async function diagrams() {
    const blocks = $$("pre.mermaid");
    if (!blocks.length) return;
    if (!window.mermaid) { blocks.forEach((b) => b.parentElement.classList.add("failed")); return; }
    window.mermaid.initialize({
      startOnLoad: false, theme: "base", securityLevel: "strict",
      fontFamily: getComputedStyle(document.body).fontFamily,
      themeVariables: {
        primaryColor: "#ffffff", primaryBorderColor: "#475569", primaryTextColor: "#1e293b",
        lineColor: "#475569", edgeLabelBackground: "#ffffff", tertiaryTextColor: "#1e293b",
        clusterBkg: "#ffffff", clusterBorder: "#475569", fontSize: "14px",
      },
      flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
    });
    let n = 0;
    for (const pre of blocks) {
      const fig = pre.parentElement;
      try {
        const { svg } = await window.mermaid.render(`hsdd-dg-${n++}`, pre.textContent);
        fig.innerHTML = remap(svg);
        fig.classList.add("rendered");
        const el = fig.querySelector("svg");
        if (el) { el.setAttribute("role", "img"); el.setAttribute("aria-label", "Diagram"); }
      } catch (err) {
        fig.classList.add("failed");
        console.warn("[hsdd-docs] diagram not rendered", err);
      }
    }
  }
  if (document.readyState === "complete") diagrams(); else window.addEventListener("load", diagrams);
})();
