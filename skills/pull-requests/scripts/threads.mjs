#!/usr/bin/env node
/**
 * The open review threads on a pull request, one JSON object per line, each carrying
 * the thread id that `reply-resolve.mjs` takes.
 *
 * `--paginate` walks every page of threads: without it, a review whose threads run
 * past the first page looks clean. Resolved threads are dropped, because what a reader
 * acts on is what is still open, and no output at all means none are.
 */

import { gh, jsonLines, parseRepo, parsePr, help } from "./gh.mjs";

help(`
Usage: node threads.mjs <repo> <pr>

Print every unresolved review thread on the pull request, one JSON object per
line: { id, path, line, author, body, url }, from the thread's first comment.
No output means no thread is open. <repo> is owner/name, or a name in
dynamicagents.
`);

const [repoArg, prArg] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const { owner, name } = parseRepo(repoArg);
const pr = parsePr(prArg);

const query = `
query($o:String!,$r:String!,$n:Int!,$endCursor:String){repository(owner:$o,name:$r){pullRequest(number:$n){
  reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor} nodes{id isResolved path line
    comments(first:1){nodes{author{login} body url}}}}}}}`;

const out = gh([
  "api", "graphql", "--paginate",
  "-F", `o=${owner}`, "-F", `r=${name}`, "-F", `n=${pr}`,
  "-f", `query=${query}`,
  "--jq", ".data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not) | @json"
]);

for (const thread of jsonLines(out)) {
  const first = thread.comments?.nodes?.[0];
  console.log(
    JSON.stringify({
      id: thread.id,
      path: thread.path,
      line: thread.line,
      author: first?.author?.login ?? null,
      body: first?.body ?? "",
      url: first?.url ?? null
    })
  );
}
