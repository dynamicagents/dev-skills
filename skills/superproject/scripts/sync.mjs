#!/usr/bin/env node
/**
 * Bring every submodule to the tip of its declared branch — the command you run
 * after merging a PR in one of them.
 *
 * This is not `git submodule update --remote --merge`, which has a flaw that
 * bites exactly here: on a detached HEAD it merges the remote branch *into the
 * detached HEAD*, leaving you still detached, now at a commit with no name.
 * And `git submodule update` in any form checks out the *recorded* commit — a
 * commit is not a branch, so it detaches you, and the next commit you write goes
 * somewhere no branch can see. You find that out after writing it.
 *
 * So: check out the declared branch, then fast-forward it from the remote.
 *
 * ## What it refuses to touch
 *
 *   - **A submodule with uncommitted changes.** Moving a branch under a dirty
 *     tree is how you lose work you have not named yet.
 *   - **A submodule on some other branch that its remote still has.** You are
 *     mid-feature there. Checking out the declared branch under you loses no
 *     commits but loses your place, which a command you run for its side effect
 *     on *other* repos has no business doing.
 *
 * A branch its remote has **deleted** is the exception, because that is what a
 * merged PR looks like from here: these repos delete a PR's branch as it merges.
 * `git branch --merged` cannot tell instead — a squash merge puts none of the
 * branch's commits on the declared branch. So a clean submodule on such a branch
 * is moved to the declared branch, and the branch and its commits stay. It takes
 * the remote saying so: a branch never pushed has no upstream, and a remote that
 * does not answer has not said the branch is gone, so both are still left alone.
 *
 * `--ff-only` is the rest of the safety: a branch carrying local commits, or one
 * rewritten upstream, stops with its own message rather than being merged into
 * silently.
 *
 * ## Symlinks first
 *
 * Run on its own it also re-materializes the symlinks a clone may have flattened,
 * before anything below — `symlinks.mjs` has the why. The order is not
 * incidental: the checkouts and merges below write working trees, so the config
 * deciding how they spell a symlink has to be right before they run, and the
 * dirty-tree guard has to see a tree that has already been repaired rather than
 * one mid-repair. `bootstrap` heals for itself and calls `sync` below, so this
 * sits in the entry point rather than in `sync`, and neither does it twice.
 *
 * ## Why it does not bump the pointers
 *
 * Moving a submodule and recording where it moved to are separate decisions. The
 * pin is the combination that was green together, so it advances when you have
 * decided it should, in a commit that says so. This prints what moved and leaves
 * that to you.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { declared, git, tryGit, currentBranch, recordedCommit } from "./submodule-config.mjs";
import { healWorkspace, reportHeal } from "./symlinks.mjs";
import { workspaceRoot, isMain, help } from "./workspace.mjs";

/**
 * Whether `branch` tracks a branch its remote no longer has. Only a remote that
 * answers can say so: no upstream, or no answer, is false.
 */
const upstreamDeleted = (dir, branch) => {
  const remote = tryGit(["config", `branch.${branch}.remote`], dir);
  const ref = tryGit(["config", `branch.${branch}.merge`], dir);
  if (!remote || !ref) return false;
  try {
    execFileSync("git", ["ls-remote", "--exit-code", remote, ref], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    return false;
  } catch (error) {
    // `--exit-code` makes "no such ref" exit 2; any other failure is not an answer.
    return error.status === 2;
  }
};

/** Returns [path, note] per submodule. */
export const sync = (root) => {
  const results = [];

  for (const [, { path, branch }] of declared(root)) {
    const dir = join(root, path);

    if (!branch) {
      results.push([path, "no branch declared in .gitmodules — skipped"]);
      continue;
    }
    // `.git` rather than `rev-parse`, which from an uninitialized submodule's empty
    // directory walks up and answers for the workspace, so everything below would act
    // on the workspace instead of skipping the submodule.
    if (!existsSync(join(dir, ".git"))) {
      results.push([path, "not initialized — run `npm run bootstrap`"]);
      continue;
    }
    if (tryGit(["status", "--porcelain"], dir) !== "") {
      results.push([path, "uncommitted changes — skipped, commit or stash first"]);
      continue;
    }

    const on = currentBranch(dir);
    const finished = on !== null && on !== branch && upstreamDeleted(dir, on);
    if (on !== null && on !== branch && !finished) {
      results.push([path, `on \`${on}\`, not \`${branch}\` — left alone`]);
      continue;
    }

    const before = tryGit(["rev-parse", "--short", "HEAD"], dir);

    try {
      execFileSync("git", ["fetch", "--quiet", "origin", branch], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      results.push([path, `could not fetch origin/${branch} — skipped`]);
      continue;
    }

    if (on !== branch) {
      // Detached, which is where `git submodule update` and a fresh clone leave you,
      // or on a branch its remote has deleted.
      if (!tryGit(["rev-parse", "--verify", "--quiet", branch], dir)) {
        try {
          git(["checkout", "-b", branch, `origin/${branch}`], dir);
        } catch {
          results.push([path, `could not create \`${branch}\` from origin/${branch} — skipped`]);
          continue;
        }
      } else {
        try {
          git(["checkout", branch], dir);
        } catch {
          results.push([path, `could not check out \`${branch}\` — skipped`]);
          continue;
        }
      }
    }

    try {
      git(["merge", "--ff-only", `origin/${branch}`], dir);
    } catch {
      results.push([
        path,
        `\`${branch}\` will not fast-forward to origin/${branch} — local commits, or rewritten upstream. ` +
          `Resolve in ${path}/ by hand.`
      ]);
      continue;
    }

    const after = tryGit(["rev-parse", "--short", "HEAD"], dir);
    const pinned = recordedCommit(root, path)?.slice(0, 7);
    const ahead = pinned && !tryGit(["rev-parse", "--short", "HEAD"], dir)?.startsWith(pinned.slice(0, 7));

    const left = finished ? `left \`${on}\`, deleted upstream: ` : "";
    results.push([
      path,
      before === after
        ? `${left}up to date at ${after} (${branch})${ahead ? " — ahead of the pin" : ""}`
        : `${left}${before} → ${after} (${branch})${ahead ? " — ahead of the pin" : ""}`
    ]);
  }

  return results;
};

export const report = (results) => {
  const width = Math.max(...results.map(([p]) => p.length));
  for (const [path, note] of results) console.log(`  ${path.padEnd(width)}  ${note}`);

  const ahead = results.filter(([, n]) => n.includes("ahead of the pin"));
  if (ahead.length > 0) {
    console.log(
      `\n${ahead.length} submodule(s) are ahead of the commit this workspace records. ` +
        `\`git add\` the ones you want to advance and commit that as its own decision.`
    );
  }
};

if (isMain(import.meta.url)) {
  help(`
Usage: node sync.mjs

Put every submodule on the branch .gitmodules declares and fast-forward it from
origin. Leaves alone a dirty submodule and one on a feature branch its remote
still has; moves a clean one off a branch its remote has deleted. Reports which
submodules are ahead of the recorded pointer and bumps none. Run from the
workspace root.
`);
  const root = workspaceRoot();
  const healed = healWorkspace(root);
  reportHeal(healed);
  report(sync(root));
  // Reported, then failed: the submodules above are still worth syncing and printing,
  // but a path left as a file is not something this run fixed, and a zero exit is how
  // that gets missed. `bootstrap` imports `sync` rather than running it, so this guard
  // is false there and it answers for its own heal.
  if (healed.some(({ warnings }) => warnings.length > 0)) process.exitCode = 1;
}
