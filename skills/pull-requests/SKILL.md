---
name: pull-requests
description: >-
  How a pull request in a dynamicagents repository is reviewed, answered and handed over: one
  Copilot review per PR, requested when it opens, answered in one pass, every thread replied to
  and resolved, and merged only once the review has landed. With scripts that read Copilot's
  review state, list the open threads and reply to and resolve one. Use before opening a PR,
  while waiting on or answering a Copilot review, and before merging one.
---

# Pull requests

Copilot reviews the pull requests in every dynamicagents repository. Each repository's
`protect-main` ruleset requests the review, and the scripts here read and answer it through
`gh`, signed in as whoever runs them. Each script takes `--help`, and a repository is
`owner/name` or a bare name in `dynamicagents`.

## Every Copilot review comment ends resolved

A PR is not ready to hand over while one of its threads is open.

Resolved does not mean accepted. Read each comment against the code first. Copilot is often
right, and sometimes confidently wrong about an API it has not read or behaviour it cannot run.
Then fix it and reply naming the commit, or reply saying why not, and resolve the thread either
way, so it records what happened. **The review body can raise points that are not threads**,
"Previously missed" ones included, so read the body of every Copilot review too.

```bash
node scripts/threads.mjs <repo> <pr>                             # open threads, one JSON object per line
node scripts/reply-resolve.mjs <thread-id> '<the fix and its commit, or why not>'
```

`threads.mjs` walks every page of threads, so a long review cannot look clean. `reply-resolve.mjs`
replies first and resolves second, so no thread closes without its sentence.

## One Copilot review per PR, answered in one pass

Every review is billed. The one GitHub requests on its own when a PR opens ready for review is
the only one a PR gets; a second happens only when a person requests it by hand. So **never ask
for another**, not with `gh pr edit --add-reviewer @copilot` and not from the Reviewers menu,
however large the fix and even when the review body offers one. And **never wait for a second
review**: nothing will bring it. Answer the one review in a single wave: fix what holds up,
push, then reply to and resolve every thread, and hand over. The fixes are checked by the
repository's `npm run check` and its specs, not by a second review.

## Knowing Copilot has finished

The review is requested automatically, and exactly when is worth knowing:

- **Opening a PR ready for review into the default branch requests it.** The `protect-main`
  ruleset asks, and it covers no other branch.
- **A draft gets no request** while it is a draft.
- **A Dependabot PR gets no request**, ever.
- **A push requests nothing.** The review of an earlier commit is the last one a PR gets, and
  fixing Copilot's comments does not bring it back.

Finished is an event on the PR's timeline, not an absence of comments: a review can finish
having left none.

```bash
node scripts/copilot-status.mjs <repo> <pr>          # reviewed | review_requested | none
node scripts/copilot-status.mjs <repo> <pr> --wait   # exit 0 reviewed, 2 never requested, 3 timed out
```

`reviewed` means done, and for good: answer it and hand over rather than poll for another.
`review_requested` means still working. `none` means it was never asked, usually a draft or a
Dependabot PR, and waiting will not change that.

Half the reviews here land within three minutes of the request and nine in ten within seven,
but the slowest measured took seventeen. So poll no faster than every thirty seconds, and stop
after twenty minutes rather than wait on a review that never started. `--wait` does both.

## Merge only once it says `reviewed`

Merging does not cancel a review in progress: it still lands, on the merged PR, and its threads
still have to end resolved, with the fixes now needing a PR of their own. The rule that every
thread is resolved before a merge cannot catch this, because a review that has not landed has
no threads to hold the merge.
