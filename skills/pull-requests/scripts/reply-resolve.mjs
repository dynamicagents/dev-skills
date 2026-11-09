#!/usr/bin/env node
/**
 * Answer one review thread and resolve it, which is what every Copilot thread ends as:
 * resolved, with a reply that says what happened, whether that was a fix or a reason
 * not to. Both are GraphQL-only.
 *
 * The reply goes first and the resolve second, so a thread is never closed without the
 * sentence that records why. If the resolve fails after the reply landed, the reply's
 * URL is still printed and the exit is 1: re-running posts a second reply, so resolve
 * that thread by hand instead.
 */

import { readFileSync } from "node:fs";
import { gh, help, fail } from "./gh.mjs";

help(`
Usage: node reply-resolve.mjs <thread-id> <body>
       node reply-resolve.mjs <thread-id> --body-file <path>

Reply to the review thread, then resolve it. Prints the reply's URL. The thread
id is the \`id\` that threads.mjs prints. The body names the commit that fixed it,
or says why not.
`);

const args = process.argv.slice(2);
const fileAt = args.indexOf("--body-file");
const thread = args[0];
const body = fileAt !== -1 ? readFileSync(args[fileAt + 1] ?? fail("--body-file needs a path."), "utf8") : args[1];

if (!thread || thread.startsWith("-")) fail("Pass the thread id first. `threads.mjs` prints it.");
if (!body?.trim()) fail("Pass the reply: the fix and its commit, or why not.");

const reply = gh([
  "api", "graphql",
  "-f", `id=${thread}`, "-f", `body=${body}`,
  "-f", "query=mutation($id:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$body}){comment{url}}}",
  "--jq", ".data.addPullRequestReviewThreadReply.comment.url"
]).trim();
console.log(reply);

const resolved = gh([
  "api", "graphql",
  "-f", `id=${thread}`,
  "-f", "query=mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}",
  "--jq", ".data.resolveReviewThread.thread.isResolved"
]).trim();

if (resolved !== "true") {
  fail(`Replied, but the thread did not resolve (${resolved || "no answer"}). Resolve it by hand; re-running replies twice.`);
}
