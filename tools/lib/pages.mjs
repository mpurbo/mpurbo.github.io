// The designed pages: the HSDD home, the reference, the tutorial index and
// the specification index. Pure functions from values to HTML strings; the
// facts come from the repository (see sources.mjs), the framing is here.
import { esc, renderMarkdown } from "./markdown.mjs";
import { relativeUrl, GITHUB } from "./links.mjs";

// ------------------------------------------------------------ shared bits
const SKILL_GROUPS = [
  ["Build the tree", ["hsdd-spec", "hsdd-contract", "hsdd-adr"]],
  ["Plan the phases", ["hsdd-phase-plan", "hsdd-reconcile"]],
  ["Execute a phase", ["hsdd-config"]],
  ["Existing systems and change", ["hsdd-adopt", "hsdd-intake", "hsdd-seal"]],
  ["Run the project", ["hsdd-checkpoint", "hsdd-milestone", "hsdd-summary"]],
  ["Unattended", ["hsdd-auto"]],
];
// The interactive guide's chapter for each skill.
const SKILL_CHAPTER = {
  "hsdd-spec": "tree", "hsdd-contract": "contracts", "hsdd-adr": "contracts", "hsdd-phase-plan": "phases",
  "hsdd-reconcile": "phases", "hsdd-config": "execute", "hsdd-adopt": "adopt", "hsdd-intake": "change",
  "hsdd-checkpoint": "manage", "hsdd-milestone": "manage", "hsdd-summary": "manage", "hsdd-auto": "auto",
  "hsdd-seal": "change",
};
const groupOf = (name) => SKILL_GROUPS.find(([, names]) => names.includes(name))?.[0] || "";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
const countWord = (n) => WORDS[n] ?? String(n);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function checkGroups(skills) {
  const grouped = SKILL_GROUPS.flatMap(([, n]) => n).sort().join();
  const listed = skills.map((s) => s.name).sort().join();
  if (grouped !== listed) throw new Error(`skill groups out of date: ${grouped} vs ${listed}`);
}

// ------------------------------------------------------------ the tree figure
// The README's acme tree, drawn in the guide's diagram vocabulary.
function treeFigure() {
  const box = (cx, y, w, h, kind, title, sub) => {
    const x = cx - w / 2;
    return `<g class="k-${kind}"><rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`
      + `<text x="${cx}" y="${y + h / 2 - 3}" text-anchor="middle" class="t-id">${esc(title)}</text>`
      + `<text x="${cx}" y="${y + h / 2 + 13}" text-anchor="middle" class="t-sub">${esc(sub)}</text></g>`;
  };
  const elbow = (x1, y1, x2, y2) => { const my = Math.round((y1 + y2) / 2); return `<path class="edge" d="M${x1} ${y1} V${my} H${x2} V${y2}"/>`; };
  const L = { root: [395, 14], be: [250, 104], we: [540, 104], auth: [120, 196], bill: [380, 196] };
  const ph = [[52, "auth.1", "types + contracts"], [152, "auth.2", "token issuance"], [252, "auth.3", "session store"]];
  return `<svg class="tree-dg" viewBox="0 0 660 340" role="img" aria-labelledby="tree-title tree-desc">
      <title id="tree-title">An HSDD tree</title>
      <desc id="tree-desc">The acme root splits into acme.backend and acme.web. The backend splits into two leaf-parents, auth and billing. Auth's three phases are the leaves. The backend and the web app meet only through a contract.</desc>
      ${elbow(395, 64, 250, 104)}${elbow(395, 64, 540, 104)}
      ${elbow(250, 154, 120, 196)}${elbow(250, 154, 380, 196)}
      ${ph.map(([cx]) => elbow(120, 246, cx, 288)).join("")}
      <path class="edge contract" d="M326 129 H464"/>
      <text x="395" y="121" text-anchor="middle" class="t-label">auth-token@v1</text>
      ${box(...L.root, 150, 50, "root", "acme", "root system")}
      ${box(...L.be, 150, 50, "internal", "acme.backend", "Team: backend")}
      ${box(...L.we, 150, 50, "internal", "acme.web", "Team: web")}
      ${box(...L.auth, 180, 50, "leafparent", "acme.backend.auth", "leaf-parent")}
      ${box(...L.bill, 180, 50, "leafparent", "acme.backend.billing", "leaf-parent")}
      ${ph.map(([cx, t, s]) => box(cx, 288, 96, 46, "phase", t, s)).join("")}
    </svg>`;
}

const TREE_CSS = `<style>
  .tree-dg { display: block; width: 100%; height: auto; }
  .tree-dg text { fill: var(--ink); font-family: var(--sans); font-size: 13px; }
  .tree-dg .t-id { font-family: var(--mono); font-size: 12.5px; font-weight: 600; }
  .tree-dg .t-sub { fill: var(--muted); font-size: 11.5px; }
  .tree-dg .t-label { fill: var(--muted); font-size: 11.5px; font-family: var(--mono); }
  .tree-dg .edge { fill: none; stroke: var(--line); stroke-width: 1.4; }
  .tree-dg .edge.contract { stroke: var(--accent); stroke-dasharray: 5 4; stroke-width: 1.6; }
  .tree-dg rect.box { stroke-width: 1.4; }
  .tree-dg .k-root rect { fill: var(--flow-bg); stroke: var(--flow); }
  .tree-dg .k-internal rect { fill: var(--process-bg); stroke: var(--process); }
  .tree-dg .k-leafparent rect { fill: var(--impl-bg); stroke: var(--impl); }
  .tree-dg .k-phase rect { fill: var(--done-bg); stroke: var(--done); }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 10px 0 0; padding: 0 4px; }
</style>`;

// ------------------------------------------------------------ home
export function homePage({ out, shell, build, skills, tutorials, specs, guide, inline, release }) {
  checkGroups(skills);
  const u = (p) => relativeUrl(out, `hsdd/${p}`);
  const use = Object.fromEntries(skills.map((s) => [s.name, s.use]));
  const firstSentence = (s) => s.split(/(?<=\.)\s/)[0];

  const body = `${TREE_CSS}
    <section class="hero">
      <div>
        <ul class="chips"><li class="chip flow">Open source · Apache-2.0</li><li class="chip"><a href="${u("changelog/index.html")}" style="color:inherit;text-decoration:none">v${esc(release.version)}${release.date ? "" : " · unreleased"}</a></li><li class="chip">Agent skills</li></ul>
        <h1>The spec is the program.</h1>
        <p class="lede">HSDD scales spec-driven development from a single spec to large, multi-team systems: recursive decomposition, first-class contracts, and one human-reviewed phase at a time.</p>
        <div class="cta">
          <a class="btn primary" href="${u("guide/index.html")}">Start the interactive guide →</a>
          <a class="btn" href="${u("users-guide/index.html")}">Read the user's guide</a>
          <a class="btn" href="#install">Install</a>
        </div>
      </div>
      <figure class="hero-figure">
        ${treeFigure()}
        <ul class="legend"><li class="chip flow">root</li><li class="chip process">internal node</li><li class="chip impl">leaf-parent</li><li class="chip done">phase</li><li class="chip">- - contract</li></ul>
        <figcaption>Only the green leaf phases drive coding cycles. Each one consumes contract interfaces by id, never another node's internals, so its session stays small.</figcaption>
      </figure>
    </section>

    <section class="section" id="why-hsdd">
      <header><p class="eyebrow">Why HSDD</p><h2>One spec stops scaling. A tree of small ones does not.</h2>
        <p>Single-spec workflows work well for small systems. As the system grows, the one spec becomes too large, every session re-reads all of it, and model focus degrades. HSDD decomposes the spec the way you would decompose the program.</p></header>
      <blockquote class="quote"><p>The unit of spec-driven development is not the product. It is the smallest independently verifiable phase with explicit contracts.</p></blockquote>
      <div class="grid" style="margin-top:16px">
        <div class="card k-decision"><div class="card-icon" aria-hidden="true">✓</div><h3>Human review is the pacing unit</h3><p>Agents produce faster than people can read. Every phase is sized to one review sitting, one Phase Equivalent, and done means a verification doc a human signed.</p></div>
        <div class="card k-process"><div class="card-icon" aria-hidden="true">⌥</div><h3>Modularity in the spec</h3><p>The spec is a tree of nodes coupled only through named, versioned contracts, split where ownership splits, with a typed dependency graph in place of whole-spec coupling.</p></div>
        <div class="card k-impl"><div class="card-icon" aria-hidden="true">ƒ</div><h3>A functional model underneath</h3><p>Each node is a function from the contracts it consumes to the contracts it produces. The dependency graph is the composition; internals stay private.</p></div>
        <div class="card k-done"><div class="card-icon" aria-hidden="true">▢</div><h3>Bounded context per session</h3><p>A phase's session gets its phase, the contracts it touches and the decisions that govern it. Per-session context tracks the phase, not the system; the total still grows with phase count.</p></div>
      </div>
    </section>

    <section class="section" id="start">
      <header><p class="eyebrow">Documentation</p><h2>Where to start</h2>
        <p>Four ways in, from a visual tour to the rules themselves. They share the same examples, so you can move between them at any point.</p></header>
      <div class="grid">
        <a class="card k-flow" href="${u("guide/index.html")}"><span class="num">${guide.chapters.length} chapters</span><h3>Interactive guide</h3><p>The method on one page you click through: the tree, contracts, phases, brownfield adoption, change intake, running the project and unattended runs.</p><span class="go">Start here →</span></a>
        <a class="card k-process" href="${u("users-guide/index.html")}"><span class="num">3 worked examples</span><h3>User's guide</h3><p>A single-level CLI, a multi-team platform and a brownfield service, prompt by prompt; then running the project week to week.</p><span class="go">Read →</span></a>
        <a class="card k-done" href="${u("tutorial/index.html")}"><span class="num">${tutorials.length} recorded runs</span><h3>Tutorials</h3><p>Real runs on a real repository, from a one-page PRD to running code, a change through intake, and a product-sized change planned unattended.</p><span class="go">Follow along →</span></a>
        <a class="card k-impl" href="${u("reference/index.html")}"><span class="num">${skills.length} skills</span><h3>Reference</h3><p>Every skill and slash command, the glossary, common questions, the specification and the changelog.</p><span class="go">Look it up →</span></a>
      </div>
    </section>

    <section class="section" id="how-it-works">
      <header><p class="eyebrow">How it works</p><h2>Two ways in, one shared loop</h2>
        <p>Greenfield starts from an idea and decomposes. Brownfield starts from a codebase and adopts it shallowly. From then on every change enters through intake into the same tree: the tree does not complete, phases complete.</p></header>
      <div class="entries">
        <div class="entry"><b>Greenfield</b><span>A brain-dump, PRD or RFC goes to <code>hsdd-spec</code>, which decomposes the system into nodes until each is small enough to phase.</span></div>
        <div class="entry"><b>Brownfield</b><span><code>hsdd-adopt</code> extracts the seams by script, writes an as-built tree with <code>v0</code> contracts that describe current behavior, and stops.</span></div>
        <div class="entry"><b>Every later change</b><span><code>hsdd-intake</code> routes a PRD, RFC, ticket or incident into the existing tree. A PRD is never a root.</span></div>
      </div>
      <ol class="steps">
        <li class="k-process"><b>Decompose</b><span>Split the system into a tree of nodes with <code>hsdd-spec</code>; cross-cutting decisions become ADRs.</span></li>
        <li class="k-process"><b>Contract</b><span>Every boundary is a versioned file with a schema or fixtures (<code>hsdd-contract</code>).</span></li>
        <li class="k-process"><b>Phase-plan</b><span>Each leaf-parent becomes ordered phases with gates and review tiers (<code>hsdd-phase-plan</code>).</span></li>
        <li class="k-process"><b>Reconcile</b><span>Drain the pending governance updates at the root (<code>hsdd-reconcile</code>).</span></li>
        <li class="k-impl"><b>Configure and build</b><span>One phase context (<code>hsdd-config</code>), then one coding cycle, OpenSpec or superpowers.</span></li>
        <li class="k-decision"><b>Review</b><span>A human reads the diff and runs the verification at the phase's tier, then signs.</span></li>
      </ol>
      <p class="note"><code>hsdd-auto</code> runs steps 1 to 4, and intake handoffs, unattended: one fresh subagent per skill invocation, every step gated and committed, every decision recorded for one review sitting. It never implements a phase or passes a review gate. Once implementation starts, <code>hsdd-checkpoint</code> runs the weekly evidence pass and <code>hsdd-milestone</code> keeps the stakeholder dates.</p>
    </section>

    <section class="section" id="install">
      <header><p class="eyebrow">Install</p><h2>${cap(countWord(skills.length))} skills, one command</h2>
        <p>HSDD ships as agent skills, installable with the <a href="https://github.com/vercel-labs/skills">skills</a> CLI, which works with Claude Code, Cursor, Codex and 70+ other agents.</p></header>
      <div class="install">
        <div class="code"><div class="code-tab"><span>bash</span><button class="copy" type="button" aria-label="Copy this block">Copy</button></div><pre><code># All ${countWord(skills.length)} HSDD skills
npx skills add mpurbo/hsdd

# Or a single skill
npx skills add mpurbo/hsdd --skill hsdd-spec</code></pre></div>
        <div class="install-notes">
          <p><b>Recommended companion:</b> Obra's <a href="https://github.com/obra/superpowers">superpowers</a> plugin. HSDD composes with its test-driven development, verification and code-review skills instead of re-implementing them, and <code>hsdd-config</code> wires them into each phase's coding session.</p>
          <p><b>Slash commands</b> are optional and not installed by the CLI: copy <a href="${GITHUB}/tree/main/commands"><code>commands/*.md</code></a> into your project's <code>.claude/commands/</code>.</p>
          <p><b>Then</b> follow <a href="${u("users-guide/index.html")}#example-1-a-simple-project-single-level">Example 1</a> of the user's guide, or the first <a href="${u("tutorial/index.html")}">tutorial</a>.</p>
        </div>
      </div>
      <div class="code is-prompt" id="quickstart" style="margin-top:14px"><div class="code-tab"><span>first prompts</span><button class="copy" type="button" aria-label="Copy this block">Copy</button></div><pre><code>"Write a high-level spec for a merchant onboarding platform."      -> hsdd-spec (root)
"Break down @hsdd/spec/acme.md into backend, mobile, and web."     -> hsdd-spec (internal node)
"Define the auth-token contract: auth produces, billing consumes." -> hsdd-contract
"Write the ADR for the auth provider decision."                    -> hsdd-adr
"acme.backend.auth is small enough. Write its phase plan."         -> hsdd-phase-plan
"Reconcile the worktrees."                                         -> hsdd-reconcile
"/hsdd-phase acme.backend.auth.2"   (switch the phase context, then run the cycle)
"/hsdd-auto"                        (plan the tree unattended, review the ledger after)</code></pre></div>
    </section>

    <section class="section" id="the-skill-set">
      <header><p class="eyebrow">The skill set</p><h2>What each skill is for</h2>
        <p>Each skill owns one step of the method and writes one kind of artifact. The <a href="${u("reference/index.html")}">reference</a> has the full entry for each.</p></header>
      <div class="skill-groups">
        ${SKILL_GROUPS.map(([g, names]) => `<div class="skill-group"><p>${esc(g)}</p>${names.map((n) =>
          `<a class="skill-link" href="${u("reference/index.html")}#${n}"><b>${n}</b><span>${inline(firstSentence(use[n]))}</span></a>`).join("")}</div>`).join("")}
      </div>
    </section>`;

  return shell({
    out, kind: "home", build, active: "",
    title: "HSDD · Hierarchical Spec-Driven Development",
    description: "HSDD scales spec-driven development from a single spec to large, multi-team systems: recursive decomposition, first-class contracts, and one human-reviewed phase at a time. Agent skills for Claude Code, Cursor, Codex and more.",
    body,
  });
}

// ------------------------------------------------------------ reference
export function referencePage({ out, shell, tocHtml, build, skills, commands, guide, specs, inline, ghBlob }) {
  checkGroups(skills);
  const u = (p) => relativeUrl(out, `hsdd/${p}`);
  const cmdsFor = (name) => commands.filter((c) => c.skill === name);
  const chapter = (name) => guide.chapters.find((c) => c.id === SKILL_CHAPTER[name]);
  const headings = [
    { depth: 2, id: "skills", text: "Skills" },
    ...SKILL_GROUPS.map(([g]) => ({ depth: 3, id: `group-${g.toLowerCase().replace(/[^a-z]+/g, "-")}`, text: g })),
    { depth: 2, id: "slash-commands", text: "Slash commands" },
    { depth: 2, id: "glossary", text: "Glossary" },
    { depth: 2, id: "common-questions", text: "Common questions" },
    { depth: 2, id: "specification", text: "Specification" },
    { depth: 2, id: "changelog", text: "Changelog" },
  ];
  const skillCard = (s) => {
    const ch = chapter(s.name);
    const cmds = cmdsFor(s.name);
    return `<article class="ref-skill" id="${s.name}">
        <header><h3>${s.name}</h3><span class="chip process">${esc(groupOf(s.name))}</span>${cmds.map((c) => `<code>${esc(c.command)}</code>`).join(" ")}</header>
        <p>${inline(s.use)}</p>
        <p class="links">${ch ? `<a href="${u("guide/index.html")}#${ch.id}-1">Interactive guide: ${esc(ch.short)}</a>` : ""}<a href="${ghBlob(`skills/${s.name}/SKILL.md`)}">SKILL.md on GitHub</a></p>
      </article>`;
  };
  const body = `<header class="doc-head">
      <p class="eyebrow">Reference</p>
      <h1>Reference</h1>
      <p class="lede">The ${countWord(skills.length)} skills and their commands, the terms the method uses, the questions people ask first, and where the rules are written down.</p>
    </header>
    <article class="prose">
      <h2 id="skills"><a class="anchor" href="#skills" aria-hidden="true" tabindex="-1">#</a>Skills</h2>
      <p>Install all ${countWord(skills.length)} with <code>npx skills add mpurbo/hsdd</code>. Each one is a <code>SKILL.md</code> an agent loads when your request matches it; you can also name it in the prompt.</p>
      ${SKILL_GROUPS.map(([g, names]) => `<h3 id="group-${g.toLowerCase().replace(/[^a-z]+/g, "-")}"><a class="anchor" href="#group-${g.toLowerCase().replace(/[^a-z]+/g, "-")}" aria-hidden="true" tabindex="-1">#</a>${esc(g)}</h3>
      <div class="ref-skills">${names.map((n) => skillCard(skills.find((s) => s.name === n))).join("")}</div>`).join("\n")}

      <h2 id="slash-commands"><a class="anchor" href="#slash-commands" aria-hidden="true" tabindex="-1">#</a>Slash commands</h2>
      <p>Optional shortcuts for Claude Code. The skills CLI does not install them: copy <a href="${GITHUB}/tree/main/commands"><code>commands/*.md</code></a> into your project's <code>.claude/commands/</code>. Each one invokes a skill with your arguments.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Command</th><th>What it does</th><th>Skill</th></tr></thead><tbody>
        ${commands.map((c) => `<tr><td><code>${esc(c.command)}</code></td><td>${esc(c.description)}</td><td><a href="#${c.skill}"><code>${c.skill}</code></a></td></tr>`).join("")}
      </tbody></table></div>

      <h2 id="glossary"><a class="anchor" href="#glossary" aria-hidden="true" tabindex="-1">#</a>Glossary</h2>
      <p>The interactive guide's glossary, the same entries it opens with <kbd>G</kbd>. The specification's last chapter is the full glossary.</p>
      <dl class="gloss">${guide.glossary.map((g) => `<div id="term-${g.id}"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></div>`).join("")}</dl>

      <h2 id="common-questions"><a class="anchor" href="#common-questions" aria-hidden="true" tabindex="-1">#</a>Common questions</h2>
      <div class="faq">${guide.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>

      <h2 id="specification"><a class="anchor" href="#specification" aria-hidden="true" tabindex="-1">#</a>Specification</h2>
      <p>The specification holds the full model and every settled decision with its provenance. Read v0.10 as the whole method and the v0.11 delta for unattended runs; the <a href="${u("spec/index.html")}">specification index</a> lists both by chapter.</p>
      <div class="grid two">${specs.map((s) => `<a class="card k-flow" href="${u(`spec/${s.slug}/index.html`)}"><span class="num">Version ${esc(s.info.version)}</span><h3>${esc(s.info.title)}</h3><p>${s.chapters.length} chapters${s.info.status ? ` · ${esc(s.info.status)}` : ""}</p><span class="go">Read →</span></a>`).join("")}</div>

      <h2 id="changelog"><a class="anchor" href="#changelog" aria-hidden="true" tabindex="-1">#</a>Changelog</h2>
      <p>Every release, what it added, changed and fixed, and how to upgrade a project in flight: <a href="${u("changelog/index.html")}">the changelog</a>. The user's guide has the <a href="${u("users-guide/index.html")}#upgrading">upgrade notes</a> on their own.</p>
    </article>`;
  return shell({
    out, active: "reference", build,
    title: "Reference · HSDD",
    description: `HSDD reference: the ${countWord(skills.length)} skills and their slash commands, the glossary, common questions, the specification and the changelog.`,
    toc: tocHtml(headings),
    body,
  });
}

// ------------------------------------------------------------ tutorials
const TUTORIAL_FACTS = {
  "simple-login": ["one-page PRD", "3 leaf-parents", "2 contracts", "superpowers"],
  "simple-login-update": ["intake: cross-node", "profile-api@v2", "3 appended phases", "checkpoint closes it"],
  "meeting-rooms": ["hsdd-auto, intake mode", "231 decisions", "12 phases", "PostgreSQL in Docker"],
};

export function tutorialIndexPage({ out, shell, build, tutorials, readme, resolve, inline, ghTree }) {
  // The README's intro and folder table, rendered; the tutorial rows become cards.
  const intro = readme.split(/\n\| # \|/)[0].replace(/^# .*\n/, "");
  const after = readme.slice(readme.indexOf("Each tutorial has the same three folders"));
  const r1 = renderMarkdown(intro, { resolve });
  const r2 = renderMarkdown(after, { resolve });
  const cards = tutorials.map((t) => `<article class="tut-card" id="${t.slug}">
        <div class="tut-num" aria-hidden="true">${esc(t.num)}</div>
        <div>
          <h3><a href="${t.slug}/">${esc(t.title)}</a></h3>
          <p class="lede">${inline(t.shows)}</p>
          <ul class="chips">${(TUTORIAL_FACTS[t.slug] || []).map((f) => `<li class="chip">${esc(f)}</li>`).join("")}<li class="chip flow">skills ${esc(t.skills)}</li></ul>
          <div class="actions">
            <a class="btn primary" href="${t.slug}/walkthrough/">Walkthrough →</a>
            <a class="btn" href="${t.slug}/">Overview and how to run it</a>
            <a class="btn" href="${t.slug}/walkthrough/process-log.html">Process log</a>
            <a class="btn" href="${ghTree(`docs/tutorial/${t.slug}`)}">Files on GitHub</a>
          </div>
        </div>
      </article>`).join("");
  const body = `<header class="doc-head">
      <p class="eyebrow">Tutorials</p>
      <h1>Tutorials</h1>
      <div class="lede">${r1.html}</div>
    </header>
    <section class="tut">${cards}</section>
    <article class="prose folders">${r2.html}</article>`;
  return shell({
    out, active: "tutorial", build, kind: "index",
    title: "Tutorials · HSDD",
    description: "Three recorded HSDD runs on one small product: a PRD to running code, a change through intake, and a product-sized change planned unattended by hsdd-auto.",
    body,
  });
}

// ------------------------------------------------------------ specification index
export function specIndexPage({ out, shell, build, specs, ghTree }) {
  const u = (p) => relativeUrl(out, `hsdd/${p}`);
  const block = (s) => `<section class="section" id="${s.slug.replace(".", "-")}">
      <header><p class="eyebrow">Version ${esc(s.info.version)}${s.info.status ? ` · ${esc(s.info.status)}` : ""}</p><h2><a href="${u(`spec/${s.slug}/index.html`)}">${esc(s.info.title)}</a></h2></header>
      <ol class="spec-chapters">${s.chapters.map((c) => `<li><a href="${u(`spec/${s.slug}/index.html`)}#${c.id}">${esc(c.text)}</a></li>`).join("")}</ol>
    </section>`;
  const body = `<style>.spec-chapters{columns:2 300px;column-gap:28px;margin:0;padding-left:0;list-style:none}.spec-chapters li{break-inside:avoid;padding:4px 0;border-bottom:1px solid var(--rule)}.spec-chapters a{text-decoration:none;color:var(--ink)}.spec-chapters a:hover{color:var(--accent)}</style>
    <header class="doc-head" style="margin-top:40px">
      <p class="eyebrow">Reference</p>
      <h1>Specification</h1>
      <p class="lede">The full model and every settled decision, with its provenance. v0.10 is the complete current specification; v0.11 is a delta on it that adds <code>hsdd-auto</code> and changes nothing else. Read them in that order.</p>
      <p class="source">The superseded delta series, v0.1 to v0.9, remains in <a href="${ghTree("spec")}"><code>spec/</code></a> on GitHub as history. Nothing requires reading it.</p>
    </header>
    ${specs.map(block).join("")}`;
  return shell({
    out, active: "reference", build, kind: "index",
    title: "Specification · HSDD",
    description: "The HSDD methodology specification: v0.10, the complete current specification, and the v0.11 delta that adds unattended runs.",
    body,
  });
}
