/**
 * Put the symlinks back when a clone flattened them.
 *
 * `CLAUDE.md -> AGENTS.md`, and every entry in `.claude/skills/`, is a symlink,
 * and git stores one verbatim: mode 120000, and a blob whose entire content is
 * the target path. That is the portability guarantee `skills.mjs` describes — the
 * link text is committed, so a clone is supposed to bring working links.
 *
 * Except when it does not. git probes for symlink support the first time it
 * writes a working tree, and a probe that fails — Windows without developer mode,
 * some container and network filesystems, a mount that was read-only for the
 * second git looked — writes `core.symlinks=false` into that repo's **local**
 * config. From then on git checks a symlink out as a plain file containing the
 * target path as text, and considers that correct: `git status` stays clean,
 * because under `core.symlinks=false` the text file *is* how a symlink is spelled
 * here. Nothing complains, and the probe's verdict outlives whatever made it
 * fail — the config is written once and re-read forever.
 *
 * What that costs:
 *
 *   - **`CLAUDE.md` stops being instructions.** It becomes a nine-byte file
 *     reading `AGENTS.md`. An agent loads it, finds a filename where the
 *     conventions should have been, and proceeds without them. Nothing reports
 *     this, because from git's side nothing is wrong.
 *   - **`npm run check` fails**, in the one way `skills.mjs` will not fix on its
 *     own: every skill link reported as "a real file, not a link", each with
 *     instructions to sort it out by hand.
 *
 * So `bootstrap` and `sync` both run this, and it does two things per repo — the
 * superproject and every submodule with a checkout, because each has its own
 * config and so its own copy of the problem:
 *
 *   1. Overrule the stale probe with `core.symlinks=true`, after checking that
 *      this filesystem really can make a symlink. The whole failure is a probe
 *      that was wrong, so this cannot take git's word for it — and must not take
 *      its own word either: forcing the config where symlinks genuinely do not
 *      work trades a quiet mess for a checkout that fails outright.
 *   2. Re-materialize what the old setting already flattened, which step 1 does
 *      not do on its own. The config governs the *next* checkout, and for a file
 *      already on disk and considered clean there is never a next one.
 *
 * Step 2 restores **only** a regular file whose bytes are exactly the target
 * path — the thing git itself wrote. Anything else living at that path, however
 * similar it looks, is somebody's data: it is reported and left where it is. A
 * `git checkout --` is not undoable and a symlink is one line, and the asymmetry
 * says which way to err.
 *
 * On a healthy checkout this reads the index, finds every link already a link,
 * and says nothing.
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { declared, git, tryGit } from "./submodule-config.mjs";

/**
 * The symlinks `dir` tracks, read from the index rather than from disk:
 * `{ links, unmerged }`, where a link is `{ path, target }` and `unmerged` holds
 * the paths that have no settled entry to restore. Null when git could not read
 * the index at all, which is not the same answer as an index holding no links —
 * one means there is nothing to do, the other means nobody knows.
 *
 * A record from `ls-files -s` is `mode object stage\tpath`, and the stage is the
 * field that decides whether there is anything to do. Stage 0 is a resolved path,
 * the only one with a single answer for what the link should be. A conflicted
 * path has no stage 0 at all — it has stages 1, 2 and 3, one record each, so
 * reading the stage out is what keeps one path from arriving three times, and
 * what keeps `git checkout --` away from an unmerged path, which it refuses
 * outright rather than picking a side.
 */
const trackedLinks = (dir) => {
  // `-z`, because a path with a newline or a quote in it is one git would quote,
  // and the quoting is not worth parsing to find out it never happens.
  const listing = tryGit(["ls-files", "-s", "-z"], dir);
  // Only null, because `tryGit` returns it for a git that failed and returns `""`
  // for an index read successfully and holding nothing. Folding the two together
  // reads an unreadable index as a clean bill of health.
  if (listing === null) return null;

  const records = listing
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const [meta, path] = record.split("\t");
      const [mode, object, stage] = meta.split(" ");
      return { mode, object, stage, path };
    })
    .filter(({ mode }) => mode === "120000");

  return {
    links: records
      .filter(({ stage }) => stage === "0")
      .map(({ object, path }) => ({
        path,
        // Bytes, not text: this gets compared against a file on disk, and `git`'s
        // trim() would make two targets that differ by a space compare equal.
        target: execFileSync("git", ["cat-file", "blob", object], { cwd: dir })
      })),
    unmerged: [...new Set(records.filter(({ stage }) => stage !== "0").map(({ path }) => path))]
  };
};

/** Whether anything at all is at `path` — `lstat`, so a dangling symlink counts as taken. */
const occupied = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * A path in `dir` that nothing is using, for the probe below to create and remove.
 * Hidden and process-unique, then suffixed until it is free, because the one thing
 * this may not do is land on a path that already exists: it deletes what it made,
 * and it can only know it made it if nothing was there.
 */
const freeProbePath = (dir) => {
  for (let n = 0; n < 100; n += 1) {
    const path = join(dir, `.symlink-probe-${process.pid}${n === 0 ? "" : `-${n}`}`);
    if (!occupied(path)) return path;
  }
  return null;
};

/**
 * Whether this filesystem can really make a symlink. git's own probe, the one
 * that wrote `core.symlinks=false`, is the failure being repaired, so its answer
 * is the one answer unavailable here — and the replacement has to be a real
 * attempt rather than an assumption, for the reason in the header.
 *
 * Probed in the **working tree**, which is the filesystem the verdict is about:
 * `core.symlinks=true` governs what a checkout writes there, and a linked worktree
 * or a submodule mounted separately from its git directory can have the two on
 * different filesystems. Asking the git directory would then answer for the wrong
 * one, set the config on its say-so, and hand the next checkout the hard failure
 * this guard exists to prevent.
 */
const symlinksWork = (dir) => {
  const probe = freeProbePath(dir);
  if (probe === null) return false;

  let created = false;
  try {
    symlinkSync("probe", probe);
    created = true;
    return lstatSync(probe).isSymbolicLink();
  } catch {
    // Including EPERM on Windows without developer mode: the negative verdict is
    // the failure to create one, and there is no other way to ask.
    return false;
  } finally {
    if (created) {
      try {
        unlinkSync(probe);
      } catch {
        // Gone already; nothing of anybody's is at this path either way.
      }
    }
  }
};

/**
 * One repo: fix the config if it is not already right, then restore the links it
 * flattened while it was wrong. Returns `{ label, note, warnings }`, where a null
 * note means there was nothing to do.
 */
export const heal = (dir, label) => {
  const warnings = [];

  // `.git` rather than `rev-parse`, which from an uninitialized submodule's empty
  // directory walks up and answers for the superproject instead.
  if (!existsSync(join(dir, ".git"))) return { label, note: null, warnings };

  // The effective value, so a `true` inherited from global config is left to stand.
  // Writing goes to local config, which is where the bad value is.
  const already = tryGit(["config", "--get", "core.symlinks"], dir) === "true";
  if (!already) {
    if (!symlinksWork(dir)) {
      warnings.push(
        `${label}: \`core.symlinks\` is off and this filesystem cannot create one, so the links stay as text ` +
          `files. On Windows that is Developer Mode (or an elevated shell); elsewhere it is the mount. Until ` +
          `then \`CLAUDE.md\` is the nine characters \`AGENTS.md\` and \`npm run check\` will fail.`
      );
      return { label, note: "filesystem has no symlinks — left alone", warnings };
    }
    git(["config", "core.symlinks", "true"], dir);
  }

  const tracked = trackedLinks(dir);
  if (tracked === null) {
    warnings.push(
      `${label}: git could not read the index — the links were not checked and nothing here was touched. ` +
        `Whatever stops \`git ls-files\` in this repo stops the repair too; fix that and re-run.`
    );
    return { label, note: null, warnings };
  }

  const { links, unmerged } = tracked;
  for (const path of unmerged) {
    warnings.push(
      `${label}: \`${path}\` is unmerged — the index holds every side of a conflict and no settled link. ` +
        `Resolve the merge and re-run; nothing here was touched.`
    );
  }

  const restore = [];
  for (const { path, target } of links) {
    const full = join(dir, path);

    let stat = null;
    try {
      stat = lstatSync(full);
    } catch {
      // Deleted. git already reports that, and undoing it is a different decision.
    }
    if (stat === null || stat.isSymbolicLink()) continue;

    if (!stat.isFile()) {
      warnings.push(
        `${label}: \`${path}\` is a ${stat.isDirectory() ? "directory" : "special file"} where a symlink belongs. ` +
          `That is not something a flattened link looks like — left alone.`
      );
      continue;
    }
    // Size first, so a large file that merely shares a prefix is never read whole.
    if (stat.size !== target.length || !readFileSync(full).equals(target)) {
      warnings.push(
        `${label}: \`${path}\` is a regular file and its content is not \`${target.toString()}\`, so it is not a ` +
          `flattened link — left alone. Move anything you want out of it, delete it, and re-run.`
      );
      continue;
    }
    restore.push(path);
  }

  // One checkout for all of them. The index already holds the mode and the target,
  // so this is only git writing the link it should have written the first time.
  //
  // `:(literal)` because everything after `--` is a pathspec, not a filename: a
  // tracked `*`, `?` or `[` would match paths nobody asked about, and a leading
  // `:` would parse as magic of its own. These paths come from the index, so the
  // match is exact by construction and the globbing has nothing to add.
  if (restore.length > 0) git(["checkout", "--", ...restore.map((path) => `:(literal)${path}`)], dir);

  const note =
    restore.length > 0
      ? `${restore.length} link(s) re-materialized${already ? "" : ", core.symlinks set"}`
      : already
        ? null
        : "core.symlinks set";

  return { label, note, warnings };
};

/**
 * This repo and every submodule that has a checkout, in declaration order. A
 * submodule with none is skipped silently — `bootstrap` heals after initializing
 * them, and `sync` reports an uninitialized one itself.
 */
export const healWorkspace = (root) => [
  heal(root, "."),
  ...[...declared(root).values()].map(({ path }) => heal(join(root, path), path))
];

/** Prints only what happened. A healthy workspace gets no output at all. */
export const reportHeal = (results) => {
  const notable = results.filter(({ note }) => note !== null);
  if (notable.length > 0) {
    console.log("\nSymlinks:");
    const width = Math.max(...notable.map(({ label }) => label.length));
    for (const { label, note } of notable) console.log(`  ${label.padEnd(width)}  ${note}`);
  }

  const warnings = results.flatMap(({ warnings }) => warnings);
  if (warnings.length > 0) {
    console.error(`\n${warnings.length} path(s) where a symlink belongs, left alone:\n`);
    for (const line of warnings) console.error(`  - ${line}`);
    console.error("");
  }
};
