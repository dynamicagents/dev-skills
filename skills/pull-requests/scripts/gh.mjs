/**
 * The one way these scripts reach GitHub: the `gh` on the PATH, signed in as whoever
 * runs them. No token is read, passed or printed here, so a script acts with exactly
 * the scope `gh` already has and nothing more.
 */

import { execFileSync } from "node:child_process";

/** `gh` with `args`, its stdout as text. A failure exits with gh's own stderr. */
export const gh = (args) => {
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
  } catch (error) {
    if (error.code === "ENOENT") fail("`gh` is not on the PATH. Install the GitHub CLI and run `gh auth login`.");
    fail(`gh ${args[0]} failed:\n${(error.stderr ?? "").toString().trim() || error.message}`);
  }
};

/** Lines of `--jq ... | @json` output, parsed. */
export const jsonLines = (text) =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));

/** `owner/name`, or a bare `name` in the dynamicagents org, as `{ owner, name }`. */
export const parseRepo = (value) => {
  const match = /^(?:([A-Za-z0-9-]+)\/)?([A-Za-z0-9._-]+)$/.exec(value ?? "");
  if (!match) fail(`\`${value ?? ""}\` is not a repository. Pass \`owner/name\`, or a name in dynamicagents.`);
  return { owner: match[1] ?? "dynamicagents", name: match[2] };
};

/** A pull request number, or a failure that names what arrived instead. */
export const parsePr = (value) => {
  if (!/^[1-9][0-9]*$/.test(value ?? "")) fail(`\`${value ?? ""}\` is not a pull request number.`);
  return value;
};

/** Prints `usage` and exits 0 when `--help` or `-h` was passed. */
export const help = (usage) => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage.trim());
    process.exit(0);
  }
};

export const fail = (message, code = 1) => {
  console.error(message);
  process.exit(code);
};
