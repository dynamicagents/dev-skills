#!/usr/bin/env node
/**
 * `.agents/skills/` is where skills live. `.claude/skills/` is where Claude Code
 * looks. This script is the bridge, and the reason it exists rather than being a
 * one-time `ln -s` is that the bridge decays on its own.
 *
 * `npx skills add -a universal claude-code` writes both, but an install run with
 * either one alone, or a copy made by hand, leaves the two out of step, and the
 * failure is silent in the direction that matters: Claude Code does not announce a
 * skill it never found. A skill that stopped loading looks exactly like a skill
 * that was never useful.
 *
 * Hence a check in `npm run check`, and a writer that is safe to re-run.
 *
 * ## The invariant
 *
 * This script owns `.claude/skills/` outright. Every entry there is a symlink
 * whose target is exactly `../../.agents/skills/<name>` for a `<name>` that
 * exists, and nothing else may live in that directory.
 *
 * **The target is relative, and that is the whole portability guarantee.** An
 * absolute link works on the machine that made it and breaks in every clone —
 * including the cloud sessions this workspace exists to serve. Git stores the
 * link text verbatim, so an absolute path is not a local mistake; it is committed
 * and published. That is why a link resolving to the right directory is still a
 * failure here if it spells the path absolutely.
 *
 * ## What it checks, and why each one is real
 *
 *   - **A source with no link.** `npx skills add`. The common case.
 *   - **A link that no longer resolves.** `npx skills remove`.
 *   - **A link with the wrong target**, including an absolute one — see above.
 *   - **A real directory where a link belongs.** Someone copied a skill in
 *     instead of linking it. It works today and silently stops tracking
 *     `.agents/` forever after, which is worse than not working at all.
 *   - **A skill with no `SKILL.md`.** A half-finished install. Claude
 *     Code skips such a directory without saying so, so nothing else would ever
 *     report it.
 *   - **A `skills-lock.json` entry with no directory.** The lockfile is the
 *     record of what `npx skills` believes is installed; an entry with nothing
 *     behind it means an install did not finish.
 *
 * That last check runs in **one direction only**: every locked entry needs a
 * directory, but a directory needs no lock entry, so that a skill written in a
 * workspace by hand, to try it before it moves to `dev-skills`, is not a build
 * failure that has to be debugged before it can be understood. Absence from the
 * lockfile is also the only thing distinguishing such a skill from an installed
 * one, which is what makes it worth stating rather than tightening.
 *
 * ## What the writer will not do
 *
 * It creates, repairs and prunes symlinks. It will **not** delete a real
 * directory found in `.claude/skills/`, even though the invariant forbids one:
 * a symlink holds no data and a directory might be the only copy of something.
 * That case is reported in both modes and fixed by hand.
 */

import { readdirSync, lstatSync, existsSync, readlinkSync, symlinkSync, unlinkSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { workspaceRoot, help } from "./workspace.mjs";

help(`
Usage: node skills.mjs [--check]

Link every skill in .agents/skills/ into .claude/skills/ as the relative symlink
../../.agents/skills/<name>, and prune links whose skill is gone. Never deletes a
real directory. Run from the workspace root.

  --check   change nothing; exit 1 if any link is missing, stale or wrong, or a
            skills-lock.json entry has no directory
`);

const root = workspaceRoot();
const SOURCE = join(root, ".agents", "skills");
const LINKS = join(root, ".claude", "skills");
const LOCKFILE = join(root, "skills-lock.json");

/** What every link must say, verbatim. Relative — see the header. */
const targetFor = (name) => join("..", "..", ".agents", "skills", name);

const check = process.argv.includes("--check");

/**
 * A skill source is a directory, and the type is read rather than assumed: a stray file
 * under `.agents/skills/` is otherwise a source this script reports as unlinked, which
 * linking cannot fix.
 */
const directories = (path) =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => e.name)
        .sort()
    : [];

/** Entries in `.claude/skills/`, including broken links, which `readdirSync` reports and `existsSync` does not. */
const linkNames = () =>
  existsSync(LINKS)
    ? readdirSync(LINKS).filter((n) => !n.startsWith(".")).sort()
    : [];

const sources = directories(SOURCE);
if (sources.length === 0) {
  console.error(`No skills found in ${SOURCE}. Install some with \`npx skills add <pack>\`.`);
  process.exit(1);
}

/** Problems a re-run cannot fix, so they fail both modes. */
const manual = [];
/** Problems the writer fixes, described for --check. */
const fixable = [];
const fixed = [];

if (!check) mkdirSync(LINKS, { recursive: true });

for (const name of sources) {
  const link = join(LINKS, name);
  const want = targetFor(name);

  let stat = null;
  try {
    stat = lstatSync(link);
  } catch {
    // Nothing at that path.
  }

  if (stat && !stat.isSymbolicLink()) {
    manual.push(
      `${name}: \`.claude/skills/${name}\` is a real ${stat.isDirectory() ? "directory" : "file"}, not a link to ` +
        `\`.agents/skills/${name}\`. It will not track the source. Move anything unique in it into ` +
        `\`.agents/skills/${name}\`, delete it, then re-run \`npm run skills\`.`
    );
    continue;
  }

  // Before the link is looked at, so the writer cannot make a link to nothing and exit 0.
  if (!existsSync(join(SOURCE, name, "SKILL.md"))) {
    manual.push(
      `${name}: \`.agents/skills/${name}/SKILL.md\` is missing. Claude Code skips a skill directory with no ` +
        `SKILL.md without reporting it. Re-install with \`npx skills add\`.`
    );
    continue;
  }

  const have = stat ? readlinkSync(link) : null;

  if (have === want) continue;

  const why =
    have === null
      ? "is not linked"
      : have.startsWith("/")
        ? `is linked to an absolute path (${have}) — it would break in every clone`
        : `is linked to ${have}, not ${want}`;

  fixable.push(`${name} ${why}`);

  if (!check) {
    if (stat) unlinkSync(link);
    symlinkSync(want, link);
    fixed.push(name);
  }
}

// Links with no source behind them. `npx skills remove` leaves these.
const stale = linkNames().filter((n) => !sources.includes(n));
for (const name of stale) {
  const link = join(LINKS, name);
  if (!lstatSync(link).isSymbolicLink()) {
    manual.push(
      `${name}: \`.claude/skills/${name}\` is not a link and has no source in \`.agents/skills/\`. Remove it by hand.`
    );
    continue;
  }
  fixable.push(`${name} is linked but no longer exists in .agents/skills/`);
  if (!check) {
    unlinkSync(link);
    fixed.push(`${name} (pruned)`);
  }
}

// The lockfile records what `npx skills` installed. One direction only: see the header.
if (existsSync(LOCKFILE)) {
  const locked = Object.keys(JSON.parse(readFileSync(LOCKFILE, "utf8")).skills ?? {});
  for (const name of locked.filter((n) => !sources.includes(n)).sort()) {
    manual.push(
      `${name}: recorded in skills-lock.json but absent from \`.agents/skills/\`. An install did not finish — ` +
        `re-run \`npx skills add\` for its pack.`
    );
  }
}

if (check) {
  if (fixable.length === 0 && manual.length === 0) {
    console.log(`skills: ${sources.length} linked into .claude/skills/`);
    process.exit(0);
  }
  if (fixable.length > 0) {
    console.error(`\n${fixable.length} skill link(s) out of step with .agents/skills/:\n`);
    for (const line of fixable) console.error(`  - ${line}`);
    console.error(`\nRun \`npm run skills\`.`);
  }
  if (manual.length > 0) {
    console.error(`\n${manual.length} problem(s) \`npm run skills\` will not fix on its own:\n`);
    for (const line of manual) console.error(`  - ${line}`);
  }
  console.error("");
  process.exit(1);
}

if (fixed.length > 0) console.log(`skills: updated ${fixed.length} link(s) — ${fixed.join(", ")}`);
console.log(`skills: ${sources.length} linked into .claude/skills/`);

if (manual.length > 0) {
  console.error(`\n${manual.length} problem(s) need a hand:\n`);
  for (const line of manual) console.error(`  - ${line}`);
  console.error("");
  process.exit(1);
}
