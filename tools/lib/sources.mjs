// Reading structured values out of the hsdd repository: the skill table in
// the README, the slash commands, the guide's glossary and questions, the
// tutorial table. Each reader fails loudly when its source changes shape, so
// a build never publishes a page with a silently empty section.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const fail = (what) => { throw new Error(`source changed shape: ${what}`); };

// Rows of the first markdown table after a heading (or in the whole text).
export function tableRows(md, heading = null) {
  let text = md;
  if (heading) {
    const i = md.indexOf(`\n${heading}\n`);
    if (i < 0) fail(`no heading ${heading}`);
    text = md.slice(i);
  }
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^\|.*\|\s*$/.test(l));
  if (start < 0) fail(`no table after ${heading}`);
  const rows = [];
  for (let i = start; i < lines.length && /^\|/.test(lines[i]); i++) rows.push(lines[i]);
  const cells = (l) => l.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((c) => c.trim());
  return rows.filter((_, i) => i !== 1).map(cells);
}

export function readSkills(src) {
  const rows = tableRows(readFileSync(join(src, "README.md"), "utf8"), "## The skill set");
  const [head, ...body] = rows;
  if (head[0] !== "Skill") fail("README skill table header");
  const skills = body.map(([name, use]) => ({ name: name.replace(/`/g, ""), use }));
  const dirs = readdirSync(join(src, "skills")).filter((d) => d.startsWith("hsdd-")).sort();
  const listed = skills.map((s) => s.name).sort();
  if (dirs.join() !== listed.join()) fail(`README lists ${listed.join(", ")} but skills/ holds ${dirs.join(", ")}`);
  return skills;
}

export function readCommands(src) {
  const dir = join(src, "commands");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const text = readFileSync(join(dir, f), "utf8");
    const desc = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim();
    const skill = /Use the (hsdd-[a-z-]+) skill/.exec(text)?.[1];
    if (!desc || !skill) fail(`command ${f}`);
    return { command: `/${f.replace(/\.md$/, "")}`, description: desc, skill };
  });
}

// GLOSSARY and FAQ are plain array literals in guide.js; evaluate just those.
export function readGuideData(src) {
  const js = readFileSync(join(src, "docs/guide/guide.js"), "utf8");
  const grab = (name) => {
    const m = new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`).exec(js);
    if (!m) fail(`guide.js ${name}`);
    const value = vm.runInNewContext(`(${m[1]})`, {});
    if (!Array.isArray(value) || !value.length) fail(`guide.js ${name} is empty`);
    return value;
  };
  const glossary = grab("GLOSSARY").map(([id, term, def]) => ({ id, term, def }));
  const faq = grab("FAQ").map(([q, a]) => ({ q, a }));
  const chapters = [...js.matchAll(/\bid: "([a-z]+)", group: "([^"]+)", short: "([^"]+)"(?:, eyebrow: "([^"]+)")?/g)]
    .map(([, id, group, short, eyebrow]) => ({ id, group, short, eyebrow }));
  if (chapters.length < 10) fail("guide.js CHAPTERS");
  return { glossary, faq, chapters };
}

export function readTutorials(src) {
  const rows = tableRows(readFileSync(join(src, "docs/tutorial/README.md"), "utf8"));
  const [head, ...body] = rows;
  if (head[1] !== "Tutorial") fail("tutorial table header");
  return body.map(([num, link, shows, skills]) => {
    const m = /^\[([^\]]+)\]\(([^)]+)\/\)$/.exec(link);
    if (!m) fail(`tutorial row ${link}`);
    return { num, title: m[1], slug: m[2], shows, skills };
  });
}

export function specInfo(src, file) {
  const text = readFileSync(join(src, "spec", file), "utf8");
  const title = /^# (.+)$/m.exec(text)?.[1];
  const version = /^\*\*Version:\*\*\s*(.+)$/m.exec(text)?.[1];
  const status = /^\*\*Status:\*\*\s*(.+)$/m.exec(text)?.[1];
  const date = /^\*\*Date:\*\*\s*(.+)$/m.exec(text)?.[1];
  if (!title || !version) fail(`spec ${file} header`);
  return { title, version, status, date };
}
