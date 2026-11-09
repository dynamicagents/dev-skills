/**
 * The frontmatter reader every spec here shares, and the list of skills it reads.
 *
 * Not a YAML parser. It reads what a skill's frontmatter holds in practice: top-level
 * `key: value` lines, folded scalars, quoted values, and one level of `metadata`.
 */

import { readdirSync } from "node:fs";

/** Every skill directory under `source`, by name. Dot-directories are not skills. */
export const skillNames = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

/**
 * A value may be quoted, and `"security-audit-discovery"` names the same skill as
 * `security-audit-discovery`. Without that, a spec meant to catch a skill Claude Code
 * has dropped rejects one it loads happily, and `""` reads as a description rather than
 * the missing one it is. `undefined` for a value whose quote never closes, which is
 * neither.
 */
export const unquote = (value) => {
  const quoted = /^(["'])([\s\S]*)$/.exec(value);
  if (!quoted) return value;
  const [, q, rest] = quoted;
  return rest.endsWith(q) ? rest.slice(0, -1) : undefined;
};

/** The block between the opening `---` and the next, or null. */
const block = (text) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? null;

/**
 * The frontmatter keys, flattened. Folded scalars (`description: >-` followed by
 * indented lines) are joined into one string, which is how Claude Code reads them;
 * a nested map collapses the same way, and `metadataOf` reads its structure.
 */
export const frontmatter = (text) => {
  const body = block(text);
  if (body === null) return null;
  const out = {};
  let key = null;
  for (const line of body.split(/\r?\n/)) {
    const top = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);
    if (top) {
      key = top[1];
      out[key] = top[2].trim();
      continue;
    }
    if (key && line.trim() !== "") out[key] = `${out[key]} ${line.trim()}`.trim();
  }
  for (const k of Object.keys(out)) {
    out[k] = unquote(out[k].replace(/^[>|][-+]?[ \t]*/, "").trim());
  }
  return out;
};

/**
 * `metadata` as the map it is: each indented `key: value` line under it. Null when the
 * field is absent. A line that is not `key: value`, or a value that opens a further
 * level, comes back under `invalid`, because the spec allows string values only.
 */
export const metadataOf = (text) => {
  const body = block(text);
  if (body === null) return null;
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex((line) => /^metadata:[ \t]*$/.test(line));
  if (at === -1) return null;
  const map = {};
  const invalid = [];
  let indent = null;
  for (const line of lines.slice(at + 1)) {
    if (!/^[ \t]/.test(line)) break;
    if (line.trim() === "") continue;
    const lead = /^[ \t]+/.exec(line)[0].length;
    indent ??= lead;
    const pair = /^[ \t]+([A-Za-z0-9_.-]+):[ \t]*(.*)$/.exec(line);
    // Deeper than the first entry is a nested level, and an empty value opens one.
    if (lead !== indent || !pair || pair[2].trim() === "") invalid.push(line.trim());
    else map[pair[1]] = unquote(pair[2].trim());
  }
  return { map, invalid };
};
