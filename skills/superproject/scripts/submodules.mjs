#!/usr/bin/env node
/**
 * The repos are submodules, and a submodule has two independent states: the
 * pointer this repo records, and whatever is checked out in the directory. They
 * are *supposed* to differ.
 *
 * That is what this script is careful not to check. A pointer is a known-good
 * combination — the commits that were green together — not a mirror of the
 * branches `.gitmodules` declares. Every commit in a subrepo makes it stale by
 * design, and `npm run sync` is how you move it when you want to. A check that
 * failed on staleness would fail constantly and be disabled within a week, and
 * it would be enforcing something nobody decided.
 *
 * So this checks **structure, not currency**: whether the submodules would
 * survive a clone.
 *
 *   - Every `.gitmodules` entry has a `url` and a `branch`. The branch is not
 *     decoration: `git submodule update --remote` reads it, and without it
 *     `npm run sync` silently does nothing for that repo.
 *   - Every declared path exists and is initialized. An uninitialized submodule
 *     is an empty directory, and every tool downstream treats it as a repo with
 *     no files rather than as an error.
 *   - Every recorded pointer names a commit that exists in that submodule.
 *   - Every url is one an environment with no SSH key can clone. A `.gitmodules`
 *     url is committed, so it has to work in the least-equipped place that will
 *     ever read it: a cloud session holds a GitHub token, installs no
 *     `openssh-client`, and reaches the network through an HTTP gateway that
 *     carries no SSH at all. HTTPS is that form. Preferring SSH is a local
 *     matter — `url.<base>.insteadOf` rewrites at transport time and nothing
 *     commits it — so the two never have to agree. `SKILL.md` has the line.
 *
 * `--pushed` is the other half and is deliberately **not** in `check`, which has
 * no network. A pointer to a commit that exists only on this machine passes every
 * local check and fails `git clone --recurse-submodules` for everyone else — the
 * one failure that breaks the thing this workspace is for, and the one that
 * cannot be seen from here without asking the remote.
 */

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { declared, git, recordedCommit } from "./submodule-config.mjs";
import { workspaceRoot, help } from "./workspace.mjs";

help(`
Usage: node submodules.mjs [--check] [--pushed]

Check that every submodule would survive a clone: each .gitmodules entry has an
HTTPS (or relative) url and a branch, is initialized, and records a pointer that
is a commit in it. Never fails on a pointer being behind its branch. Run from the
workspace root. --check is accepted for symmetry and changes nothing.

  --pushed   also ask each remote whether a branch contains the recorded pointer
`);

const root = workspaceRoot();
const pushed = process.argv.includes("--pushed");

const declaredSubs = declared(root);

const problems = [];

if (declaredSubs.size === 0) problems.push(".gitmodules declares no submodules.");

for (const [name, { path, url, branch }] of declaredSubs) {
  if (!path) {
    problems.push(`${name}: no path in .gitmodules.`);
    continue;
  }
  if (!url) problems.push(`${name}: no url in .gitmodules.`);
  // A relative url is resolved against this repo's own remote, so it inherits
  // whatever transport the clone used and is fine. Anything else has to be HTTPS —
  // see the header. `git://` is rejected with the rest because GitHub stopped
  // serving it.
  if (url && !/^(https:\/\/|\.{1,2}\/)/.test(url)) {
    problems.push(
      `${name}: \`${url}\` is not an HTTPS url. A session with a GitHub token and no key cannot clone it, ` +
        `and that is most of them. Use \`https://github.com/dynamicagents/<repo>.git\`; to keep using SSH here, ` +
        `run \`git config --global url."git@github.com:".insteadOf "https://github.com/"\` — it must be global, ` +
        `because a submodule reads its own config and yours, never the superproject's.`
    );
  }
  if (!branch) {
    problems.push(
      `${name}: no branch in .gitmodules — \`npm run sync\` (git submodule update --remote) will skip it silently. ` +
        `Set one with \`git config -f .gitmodules submodule.${name}.branch main\`.`
    );
  }

  const dir = join(root, path);
  if (!existsSync(join(dir, ".git"))) {
    problems.push(`${name}: ${path}/ is not an initialized submodule. Run \`git submodule update --init\`.`);
    continue;
  }

  // The pointer this repo records, read from the index rather than from a status
  // string, so a dirty working tree cannot change the answer.
  const recorded = recordedCommit(root, path);
  if (!recorded) {
    problems.push(`${name}: no gitlink recorded for ${path}. It is a directory, not a submodule.`);
    continue;
  }

  try {
    git(["cat-file", "-e", `${recorded}^{commit}`], dir);
  } catch {
    problems.push(`${name}: recorded pointer ${recorded.slice(0, 8)} is not a commit in ${path}/.`);
    continue;
  }

  if (pushed) {
    const remote = url ?? "origin";
    // `branch -r` reads only the remote-tracking refs this clone already holds, so a branch
    // deleted upstream would still vouch for the commit. Fetched and pruned first, and held
    // to `origin`, because a ref from any other remote says nothing about what a clone gets.
    try {
      execFileSync("git", ["fetch", "--quiet", "--prune", "origin"], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      problems.push(`${name}: could not fetch ${path}/ from origin, so nothing says ${recorded.slice(0, 8)} is pushed.`);
      continue;
    }
    try {
      const found = execFileSync("git", ["branch", "-r", "--contains", recorded, "--list", "origin/*"], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }).trim();
      if (!found) {
        problems.push(
          `${name}: recorded pointer ${recorded.slice(0, 8)} is on no remote branch. ` +
            `\`git clone --recurse-submodules\` would fail for anyone but you. Push ${path}/ (${remote}).`
        );
      }
    } catch {
      problems.push(`${name}: could not ask ${path}/ which remote branches contain ${recorded.slice(0, 8)}.`);
    }
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} submodule problem(s):\n`);
  for (const line of problems) console.error(`  - ${line}`);
  console.error("");
  process.exit(1);
}

console.log(
  `submodules: ${declaredSubs.size} registered and initialized${pushed ? ", every pointer on a remote branch" : ""}`
);
