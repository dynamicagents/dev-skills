/**
 * Where these scripts act, and how each one answers `--help`.
 *
 * **The workspace is the directory a script is run from**, which is where npm runs a
 * package's scripts, and never the script's own location. A skill is installed into
 * `.agents/skills/<name>/` of whichever workspace ran `npx skills add`, and reached
 * through `.claude/skills/<name>` as well, so where a file sits says nothing reliable
 * about which checkout it serves. A directory without `.gitmodules` is not a workspace,
 * and acting on it as one would report an empty set of submodules as a healthy one.
 */

import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const workspaceRoot = () => {
  const root = process.cwd();
  if (!existsSync(join(root, ".gitmodules"))) {
    console.error(
      `${root} has no .gitmodules, so it is not a workspace. Run this from a workspace's root, ` +
        `which is what \`npm run <script>\` does.`
    );
    process.exit(1);
  }
  return root;
};

/**
 * Whether the module at `url` is the script node was asked to run, rather than an import
 * of it. Compared by real path: run through the `.claude/skills/` link, `argv[1]` names the
 * link while `import.meta.url` names the file behind it, and a plain string comparison
 * would decide that nothing is the entry point.
 */
export const isMain = (url) => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
};

/** Prints `usage` and exits 0 when `--help` or `-h` was passed. */
export const help = (usage) => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage.trim());
    process.exit(0);
  }
};
