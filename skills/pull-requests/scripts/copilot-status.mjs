#!/usr/bin/env node
/**
 * Whether Copilot's review of a pull request has landed, read from the PR's timeline.
 *
 * Finished is an event, not an absence of comments: a review can finish having left
 * none. So the answer is Copilot's latest review event, `reviewed` or
 * `review_requested`, and `none` when it was never asked, which waiting will not change.
 *
 * `--wait` polls every thirty seconds, no faster, and gives up after twenty minutes by
 * default, past the slowest review measured. `SKILL.md` has the measurement.
 */

import { gh, parseRepo, parsePr, help, fail } from "./gh.mjs";

help(`
Usage: node copilot-status.mjs <repo> <pr> [--wait] [--timeout <minutes>]

Print Copilot's latest review event on the pull request: reviewed,
review_requested, or none (never requested). Exit 0.

  --wait               poll every 30 s until reviewed. Exit 0 once reviewed, 2 if
                       never requested, 3 if still requested at the timeout
  --timeout <minutes>  how long --wait polls (default 20)
`);

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith("-") && args[i - 1] !== "--timeout");
const { owner, name } = parseRepo(positional[0]);
const pr = parsePr(positional[1]);
const wait = args.includes("--wait");
const timeoutAt = args.indexOf("--timeout");
const minutes = timeoutAt === -1 ? 20 : Number(args[timeoutAt + 1]);
if (!(minutes > 0)) fail("--timeout takes a number of minutes.");

const POLL_MS = 30_000;

const status = () => {
  const events = gh([
    "api", "--paginate", `repos/${owner}/${name}/issues/${pr}/timeline`,
    "--jq",
    '.[] | select((.event=="review_requested" and .requested_reviewer.login=="Copilot") or (.event=="reviewed" and .user.login=="Copilot")) | .event'
  ])
    .split("\n")
    .filter(Boolean);
  return events.at(-1) ?? "none";
};

let state = status();
if (!wait) {
  console.log(state);
  process.exit(0);
}

const deadline = Date.now() + minutes * 60_000;
while (state === "review_requested" && Date.now() + POLL_MS <= deadline) {
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  state = status();
}
console.log(state);
process.exit(state === "reviewed" ? 0 : state === "none" ? 2 : 3);
