# mpurbo.github.io

The personal landing page and the HSDD documentation site,
`https://mpurbo.github.io/hsdd/`.

| Path | What it is |
|------|------------|
| `index.html`, `404.html`, `favicon.svg` | The landing page. Hand-written, self-contained (inline CSS and script). |
| `hsdd/` | The HSDD documentation. **Generated**; never edit it by hand. |
| `tools/build-hsdd.mjs`, `tools/lib/`, `tools/assets/` | The generator and the docs' stylesheet and script. |
| `tools/serve.mjs` | A preview server that serves directories and 404s the way GitHub Pages does. |
| `.nojekyll` | Serve files as they are. Without it, Jekyll would drop and rewrite parts of the tutorials. |

## Rebuilding the HSDD docs

```bash
npm install                 # once: marked 15.0.12 and mermaid 11.17.2, pinned
npm run build               # reads ../hsdd; or: node tools/build-hsdd.mjs --src <path>
npm run serve               # http://127.0.0.1:4000/
```

The hsdd repository is the single source. The build:

- renders `docs/users-guide.md`, `CHANGELOG.md`, the current specification
  (`spec/hsdd-spec-v0_10.md` and the `v0_11` delta), the tutorial READMEs and
  their process logs into pages that share the interactive guide's tokens,
  top bar and theme;
- builds the home, reference, tutorial index and specification index pages
  from facts it reads out of the repository (the README's skill table,
  `commands/`, the guide's glossary and questions, `docs/tutorial/README.md`)
  and fails if one of them changed shape;
- copies `docs/guide/` and each tutorial's `walkthrough/` unchanged except
  for their links into the repository and a "← Docs" or "← Tutorials" link
  in the top bar;
- resolves every link against the repository: a target the site publishes
  points at its page, anything else (code, templates, recorded runs) points
  at GitHub on `main`;
- checks every relative link and anchor in the output, including the
  anchors `guide.js` builds in script, and exits non-zero on a broken one.

The footer and `hsdd/BUILD.txt` name the commit the docs were built from.
Build from the commit you mean to publish, normally `main`.

Mermaid is vendored to `hsdd/assets/vendor/` (3.5 MB, about 1 MB gzipped)
and loaded only by pages with a diagram. The diagrams keep their pastel
palette in the source; the page swaps each color for its theme token, so
they follow light and dark like the rest of the page.
