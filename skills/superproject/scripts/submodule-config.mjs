/**
 * What `.gitmodules` declares, read through `git config` rather than by parsing
 * the file, because git's interpretation of it is the only one that matters.
 *
 * Shared by every script that touches a submodule. The declarations are one
 * fact and they get one home.
 */

import { execFileSync } from "node:child_process";

export const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** `git`, but a failure is an answer rather than a throw. */
export const tryGit = (args, cwd) => {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
};

/** name -> { path, url, branch }, in declaration order by name. */
export const declared = (root) => {
  const out = new Map();
  const lines = tryGit(["config", "-f", ".gitmodules", "--list"], root);
  if (!lines) return out;
  for (const line of lines.split("\n").filter(Boolean)) {
    const [key, ...rest] = line.split("=");
    const m = key.match(/^submodule\.(.+)\.(path|url|branch)$/);
    if (!m) continue;
    const [, name, field] = m;
    if (!out.has(name)) out.set(name, {});
    out.get(name)[field] = rest.join("=");
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
};

/**
 * The commit this repo records for a submodule: its stage-0 gitlink in the index, which is
 * what the next commit will record and what a dirty working tree cannot change. `HEAD:<path>`
 * would answer for the last commit, so a staged pointer would go unchecked. Null when the
 * index has no settled gitlink at that path.
 */
export const recordedCommit = (root, path) => {
  const listing = tryGit(["ls-files", "-s", "--", `:(literal)${path}`], root) ?? "";
  for (const line of listing.split("\n")) {
    const [meta, entry] = line.split("\t");
    const [mode, object, stage] = (meta ?? "").split(" ");
    if (entry === path && mode === "160000" && stage === "0") return object;
  }
  return null;
};

/** The branch a submodule is on, or null when its HEAD is detached. */
export const currentBranch = (dir) => {
  const b = tryGit(["symbolic-ref", "--short", "-q", "HEAD"], dir);
  return b || null;
};
