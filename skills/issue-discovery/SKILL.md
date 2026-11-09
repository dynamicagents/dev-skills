---
name: issue-discovery
description: >-
  Go looking for what is worth fixing across the train: a bug, a behaviour no test would
  catch breaking, a doc that says something the code does not, or maintenance surface that
  could be removed. Reads every repository at rest in small waves of named hypotheses, drawn
  from angles that rotate between runs so each run looks somewhere new, confirms the evidence
  itself, then goes deep on the findings it keeps so each one names every site. Files at most
  three standalone findings as public GitHub issues in the repository that holds the root
  cause, plus one bundle issue per repository for the small items it met on the way, and
  writes one report per run. Discovery only: it writes no fix, no dependency bump and no pull
  request. Use when asked for an issue, bug or refactor discovery round across the train. Not
  for reviewing the pending diff on a branch, and not for a security finding, which goes to a
  private advisory instead.
disable-model-invocation: true
---

# Issue discovery

**The best outcome is a fix somebody merges.** A finding is worth what it changes once it is
fixed: a bug nobody hits again, a regression a spec now catches, a doc that stops misleading,
a line that is no longer there.

Be honest about what that makes this run. It files issues; it fixes nothing by itself. What
moves the train is how often it runs and how many of its issues get done, which is why the
report carries a standing count of what earlier findings became (step 11).

The unit of work is an **attempt**: a named hypothesis about one root cause, its kind and what
it costs, tested against the code until it is confirmed or dropped. Not a pass over a file
list, and not a list of things that could be nicer. A run makes its attempts in **small
waves**, keeps the best three, and then goes deep on those three rather than wide on more.

Triggered by a person, or by the Coordinator on a person's behalf. Nothing schedules it.

The workspace `AGENTS.md`, under "Discovery runs", carries the evidence gate, the ranking
axes, the disposition table, the citation rule, the cap and the rules against edits and
against reading a credential. Read it first; this file carries what is specific to this run.

**What it is not.** Not `simplify` or `code-review`, which are Claude Code built-ins scoped to
a branch's diff or a pull request: this run reads every repository as it stands, changes
nothing, and finds what no diff ever touched. And not `security-audit-discovery`: anything
with a security impact leaves this run by the private route in step 7.

---

## 1. The brief

A run holds no state between runs. Everything it knows about earlier attempts arrives in
the prompt that starts it:

```yaml
min_tier: local          # the floor. Step 7
history: <url>           # the most recent report's link, or absent. Open it for the table
history_state: complete  # complete, incomplete or reconstructed
prior_reports: []        # up to four older, unexpired links: the detail, and the fallback
deadline: <ISO-8601 UTC> # optional. Absent means the run computes its own in step 2
```

**The run reads the history the brief names, and goes looking for none of its own.** The
rolling table is not copied into the brief: `history` is a link, and the run opens it and
reads the table out of the report behind it. That is a read of a page and not a call to a
store (`AGENTS.md`, under "A run is briefed, and keeps nothing").

- **A link that yields no table is unknown history, never a clean window.** A record past
  its retention, a link that arrived wrong, a host answering with a page no table can be
  read out of: each leaves this run without the window it was meant to have, and **no
  status code tells them apart**, because a host may answer `200` with a page that holds
  nothing. What decides it is whether a table came back. Say which link failed.
- **Absent history is not evidence of novelty.** An attempt the window does not show is
  unknown, not new. Say which it is, and never present a thin window as a clean one.
- `prior_reports` is the detail behind the table, opened when it would change what this run
  does, and as the fallback where `history` yielded nothing.
- `min_tier` arrives as `local`, and step 7 is where that is binding.

**The predecessor's history is this run's.** This skill was `refactor-discovery`: a report
filed under that name carries the same table, and its issues carry `Refactor-Run` and
`Refactor-Hypothesis` where this run writes `Discovery-Run` and `Discovery-Hypothesis`. Read
both spellings wherever this file reads a trailer. A host that lists reports by skill name
hands over the predecessor's link only when its caller passes it, so a first run under this
name may arrive with none; that is unknown history, as above.

**This run has a second history the report cannot give it, and it is the better half.** Its
records are public issues that never expire, so what was *filed* is readable at any time
from the repositories themselves (step 9). The report says what was **attempted**, which is
the part that exists nowhere else: every hypothesis this run ruled out leaves no issue
behind. Neither is the other's index, so say which of the two answered a question.

---

## 2. One clock, shared

Take the run's timestamp and its deadline once, at the start, in UTC. The deadline goes
verbatim into every brief this run hands out: two workers must never disagree about when to
stop. The timestamp is this run's id and stays with the orchestrating run: a worker files
nothing, so it has no use for one.

```bash
date -u +%Y-%m-%dT%H:%M:%SZ                                 # Discovery-Run: this run's id
date -u -d '+<window_minutes> minutes' +%Y-%m-%dT%H:%M:%SZ  # the deadline, if the brief named none
date -u -v+<window_minutes>M +%Y-%m-%dT%H:%M:%SZ            # the same, where date is BSD's and -d is not a flag
```

```yaml
# The run's one clock. Minutes, UTC, computed once and shared verbatim. `window_minutes`
# is where the deadline above comes from, and the only place that number is written.
window_minutes: 90        # the start of research to the deadline
open_candidates_until: 25 # minutes before the deadline: no wave is opened after it
confirm_until: 15         # minutes before the deadline: confirmation and depth stop here
```

**The window is a ceiling, not a target.** The search ends at the third standalone
confirmation (step 8), when no angle is left to take (step 4), or at `open_candidates_until`,
whichever comes first; depth on what was kept ends when it is done or at `confirm_until`. Filing a confirmed finding, writing the
report and handing the session back all complete after the deadline has passed, because a
clock that could stop a confirmed finding from reaching its issue would throw away work
already paid for.

A deadline is **never** a reason to drop the floor, weaken the evidence bar or file a
candidate that is not confirmed. Running out of time means a run with fewer findings, and
the report says where the clock bit.

A brief may name a deadline closer than `open_candidates_until`. The margins are absolute
minutes before it, not fractions of the window, so there is then no room to open a candidate
that could ever be confirmed. Open none, report the window as too short to research in, and
stop.

---

## 3. Check the capability before spending the window

Probe the issue routes this run depends on **before** researching anything. The create
probe makes nothing, because the body has no `title` and the endpoint requires one. A `422`
is the green light: the endpoint accepted the caller and rejected the body.

```bash
# Create path, per candidate destination repository. `issues=write`.
echo '{}' | gh api -i --method POST repos/dynamicagents/<repo>/issues --input -

# Read path, the same repositories. `issues=read`.
gh api -i "repos/dynamicagents/<repo>/issues?state=all&per_page=1"
```

`-i` is load-bearing: without it `gh` prints the body and the status and swallows the
response headers, and `X-Accepted-Github-Permissions`, the permission GitHub says the
endpoint wanted, is the only thing that separates a missing permission from a missing role.

**A refused create stops the run for that repository**, and **every create refused stops the
run**: there is then nothing this session could do with a finding. Report which endpoint
refused and what that header asked for, say that a session's credential is not the Worker's
`GITHUB_TOKEN` binding (separate paths, so a scope granted to the deployment does not reach
a CLI session), and ask for it to be fixed. Do not research on in the hope it clears.

A refused listing stops less than a refused create. Without it step 9 cannot run, and a
finding filed with no history behind it is how a decision somebody already made gets
re-filed. So a candidate owned by a repository whose listing is refused is researched like
any other and handed back with its prepared bodies, never filed blind. Its report row is
`confirmed, not filed`.

Capability is read from status codes only. **Never read, echo, log or copy a credential.**

`references/issue-api.md` carries what each call needs, what was measured, and the labels
step 10 files under.

---

## 4. Form the hypotheses

**Read the constraints first.** Each repository's `AGENTS.md` states what must not be
weakened and where a thing is supposed to live: the workspace's own "Where a change goes"
table, core's "The line core does not cross", starter's "Where a thing goes", "The two
invariants that have already broken once" and "Size ceilings", g2a-protocol's "The three
rules", plugins' rule that no subpath's module graph may reach a sibling's, and
create-dynamicagents' "What it writes, and why that is pinned". A rule stated that plainly
is the cheapest finding there is, because the repository has already agreed with it.

**A constraint the code already states is a prior disposition.** These repositories comment
heavily and hold a comment to the code's bar, so a candidate the comments already explain is
not a finding unless the run shows the stated constraint no longer holds. Reading past it is
how a run spends its window rediscovering decisions.

A hypothesis names **one root cause, its kind and what it costs today**. A candidate that
names a shape somebody would prefer is a preference, and preferences are `cosmetic`
(step 7).

### The kinds

Anything a run bumps into is one of these, and the kind decides the evidence (step 6) and the
label (step 10):

- **bug**: the code does something other than what it promises, and somebody reaches it. The
  promise is written somewhere: a doc comment, an `AGENTS.md`, a README, a type, an error
  message, or the reference deployment doing otherwise.
- **test**: a behaviour that matters and that no spec would notice breaking.
- **docs**: prose a reader acts on, a README, an `AGENTS.md`, a doc comment, a message a user
  meets, that says something the code does not, or an instruction that no longer runs.
- **refactor**: maintenance surface that could be removed or made smaller with no change in
  observable behaviour, or with a little change that is clearly better.

### The angles, and how they rotate

An angle is where a hypothesis comes from. Each angle finds a different kind of thing, and a
run that keeps to the same ones finds what the last run already found. So every hypothesis
records its angle, the report counts what each produced (step 11), and the next run reads
that count before it picks.

- **Changed since the last run.** The previous report's `Read at` line names a commit per
  repository; `gh api repos/dynamicagents/<repo>/compare/<that sha>...main` is what landed
  since. New code is where new bugs, new copies and new stale comments are.
- **Variant analysis.** Every fix merged since the last run is a claim that the mistake it
  fixed was a mistake. Search the train for the same mistake where the fix did not reach.
- **Review residue.** The review threads and review bodies on pull requests merged since the
  last run: what a reviewer caught once is a pattern to look for everywhere else.
- **Contract against behaviour.** A doc comment, a README or an `AGENTS.md` sentence held
  against the code it describes, read at `HEAD`.
- **Sibling parity.** Things meant to agree that nothing checks: create-dynamicagents'
  templates against starter's files, core's checker copies against plugins', one tenant
  against another.
- **Failure paths.** What a consumer or an end user meets when something goes wrong: an
  error that does not say what to do next, a catch that swallows, a retry with no bound, a
  cancel that keeps going.
- **Test gaps.** A fix commit with no spec beside it, an exported function no spec names, a
  branch with a real consequence that no spec enters, a skipped or empty spec.
- **Docs that no longer run.** Commands, script names and flags in READMEs and `AGENTS.md`
  files, held against `package.json` and the scripts that exist.
- **Upstream changelogs.** What the pinned versions of `agents`, `@cloudflare/think` and `ai`
  changed or deprecated since: an API that deletes a workaround here, or breaks an
  assumption. Filed as an issue naming the API, never as a bump: a dependency change is not
  this run's to make.
- **House rules.** A rule an `AGENTS.md` states, broken. The comment rules are the most
  checkable: no changelog in a comment, no package version or date in prose, no counts.
- **The `simplify` lenses.** Transcribed here because that skill is a Claude Code built-in
  with no file in this workspace. Each ends the same way, and that ending is the point: **a
  finding names the thing that replaces it.**
  - *Reuse*: code that re-implements what the train already has, one fact with two homes,
    or a value two repositories spell identically that `g2a-protocol` exists to own.
  - *Simplification*: redundant or derivable state, copy-paste with slight variation, dead
    code, a knob nothing sets, an abstraction with one caller, a branch for an edge case
    nobody has met.
  - *Efficiency*: redundant work, independent operations run in sequence, blocking work on a
    hot path, a long-lived object built from a closure that keeps its scope alive.
  - *Altitude*: a symptom patched where the cause lives deeper: durable-execution logic in
    the deployment, a capability's Durable Object outside plugins, prompt copy or a number
    in core.

**The rotation rule.** The first wave always takes *changed since the last run*, and at least
one angle the previous report did not use; where it used every one, the angle it confirmed
least from stands in. No later wave repeats an angle of this run unless that angle produced a
confirmation. **When no angle is left to take, the search is over**, however much window
remains: step 8 deepens what was confirmed, and the report says the angles ran out. A run
handed no report has no commits to compare from and no angles to avoid: it says so, and
takes any angles it likes in their place.

**The re-attempt rule.** A hypothesis the table already holds as `ruled out` or `prior
decision` is reopened only when the code it read has changed since:
`git log --since=<its run (UTC)> -- <the paths its summary names>` in each repository it
names. The timestamp is the baseline because it is the one thing every carried row keeps,
including rows whose report has expired. A row whose summary names no path cannot be checked
that way: it is reopened only by reading the code it describes, and the report says which
rows were judged so. A row handed back for the private route is never reopened here. A row
marked `inconclusive` is fair game, and its summary says where to start.

### The hypothesis phrase

Each attempt gets a short readable phrase naming the root cause and its cost, and it is the
name that attempt keeps: the first column of the report table, and the stable key a later
run recognises it by. **It may name a repository, a module and a path**, because this run's
records are public.

**Novelty is a judgment, not a key.** Hold the phrase against the table the history link
carried and against the issues step 9 lists, and ask whether that root cause has been
attempted: the same root cause under different words is a repeat, a different cause is new.
No taxonomy, no hash, and no pretending that history nobody handed you proves anything.

---

## 5. Investigate in small waves

A **wave** is up to three hypotheses, one investigator each, opened together. Three is the
ceiling because every claim that comes back has to be verified by the run itself (step 6),
and that verification is the narrow part: more workers buys queued claims, not findings.

After each wave the run verifies what came back, classifies it (step 7), and then decides:

- **three standalone findings confirmed**: the search is over, and step 8 takes the run deep;
- **fewer**: open the next wave, from angles the rotation rule still allows;
- **no angle left, or `open_candidates_until` reached**: no further wave; step 8 deepens what
  was confirmed.

One investigator takes one candidate, and its brief stands on its own: a skill with
`disable-model-invocation: true` is not preloaded into a subagent (`AGENTS.md`, under "The
prompt names the skill"), so nothing in the brief may assume the subagent can read this
file. A worker brief carries the hypothesis phrase and its kind, what to read and which sites
to establish, the run's deadline verbatim, the evidence bar for that kind from step 6, and
the rules it works under: change nothing, file nothing, publish nothing, and never read,
echo, log or copy a credential. Filing is the orchestrating run's alone.

**Depth, not more workers.** A candidate still unresolved after it has been read carefully
is Supported and drops out of filing. A second investigator on it buys a second opinion,
which is not evidence.

**What a wave meets on the way is kept.** A small item an investigator passes while chasing
its hypothesis, a wrong comment, a dead pointer, a spec that asserts nothing, is recorded
with its evidence for its repository's bundle (step 10). The run never opens a wave to look
for bundle items: they are what it bumps into, not what it is for.

---

## 6. The run verifies, the worker does not

A subagent's report is a **claim**, and a claim is not evidence. Before a candidate can be
filed, the orchestrating run re-reads the code at `HEAD` itself and re-runs whatever the
claim rests on, naming the commit it read.

Every Confirmed finding shows **the root cause and every site it reaches**, each a full-SHA
permalink with a line range, plus a named command and its output a reader can re-run, and
**which audience sees it** (step 7). What else it needs is set by its kind:

| kind | what makes it Confirmed |
| ---- | ----------------------- |
| **bug** | the expected behaviour, quoted from where it is written, and the actual behaviour shown: a reproduction under `/tmp/issue-discovery/` with its output, or a path traced end to end in permalinks with no judgment step in it. Who reaches it, and on what path |
| **test** | the behaviour no spec exercises, named at its permalink; the command showing no spec reaches it; and why it is worth a test: a regression already paid for, a fix that landed with no spec, or a consequence a reader can see |
| **docs** | the statement, and what contradicts it at `HEAD`: the code, or a command's output where an instruction no longer runs, or a reader who demonstrably got it wrong (an issue, a review thread) |
| **refactor** | the cost already paid, shown rather than asserted; what it removes, counted by kind, with its row of the surface table and its behaviour class in step 7 |

**Whether a defect is a defect or an accepted simplification is the judgment step**, and it
has a test: where the expectation is written. A doc comment, an `AGENTS.md` or the reference
deployment stating the behaviour makes the omission a bug; nothing written makes it a
question for the owner, handed back as Supported.

**A discovery run writes no patch, so it never establishes that a change is
behaviour-neutral.** It establishes the root cause, the cost, what would change and what
covers the code today. A reproduction is evidence that the problem exists, run against the
code as it is; it is never a fix.

Reading every repository in the train at a pinned combination adds rules:

- **Name the commit per repository, and say when a checkout is behind.** A finding read
  against a stale checkout may already be fixed upstream. Compare what was read with
  `gh api repos/dynamicagents/<repo>/commits/main --jq .sha` and report any that differ.
- **Reproductions run outside every checkout**, under `/tmp/issue-discovery/`, from plain
  copies. A harness that copies into a directory symlinked into a checkout writes into that
  checkout, so confirm `find -type l` is empty under the staging directory before running
  anything there.
- **Leave every checkout as you found it, which is not the same as leaving it clean.**
  Prefer `git`, `rg` and `gh`, which write nothing. Some commands do write: starter's
  `npm run check` runs `wrangler types`, and a playback run has dirtied core's cassettes
  before. Before running one of those, read `git status` in that checkout:
  - **Already dirty: do not run it there.** Somebody's uncommitted work is in the way, and
    after the command the run cannot tell their changes from its own, so the one rule it
    could follow next, restore, is the one that would destroy their work. Read that
    repository with read-only commands instead, and say in the report which checkout was
    dirty and what went unrun because of it.
  - **Clean: run it, then read `git status` again and restore what the command wrote.**
    Here a restore is safe precisely because the checkout had nothing to lose.

  Never `git checkout`, `git restore` or `git stash` across a checkout the run did not find
  clean. A discovery run that destroys uncommitted work has changed source, which is the
  one thing it may never do.

Stop confirming at `confirm_until`. A candidate still unconfirmed when the clock reaches it
is Supported, and the report says the clock decided it.

---

## 7. What a finding is worth, and what never goes public

### The tiers, and the floor

| tier | what it takes |
| ---- | ------------- |
| `structural` | crosses a published surface or more than one repository; a bug a consumer of the published packages or a deployed agent's end user reaches; or a rule an `AGENTS.md` states outright, broken |
| `recurring` | a cost already paid more than once: copies that have already diverged, a mistake fixed once and present elsewhere, a regression a missing spec already let through, a doc that has already misled somebody |
| `local` | one module, one reader, a cost paid once: a wrong comment or doc line, a small test gap, a local cleanup, a small bug on a rare path |
| `cosmetic` | a preference with no cost shown. Never filed, at any floor |

**The tier decides whether a finding is filed; the fix decides how.** A finding whose fix
needs its own review or a decision is **standalone**, counted against the cap in step 8, and
only `recurring` and above qualifies. A finding whose fix is small and obvious, a few lines a
reviewer checks at a glance, goes into its repository's **bundle** (step 10) whatever its
tier, and how often its cost recurred goes into the item as evidence; a small fix several
repositories need is an item in each of their bundles. A `local` candidate whose fix needs a
decision from the owner, which direction to take or whether the behaviour is wanted, is
neither: it is handed back, with the question named.

**The floor is `min_tier`, and it starts at `local`.** It decides whether bundles are filed
at all: only an explicit instruction from the invoking agent, in words, in the brief, raises
it, and only to `recurring`, for a run that files standalone findings and nothing else.
Nothing lowers it, and nothing else moves it: not a run that has found nothing, not absent
history, not an approaching deadline, not a cap with room left in it. `cosmetic` is never
filed at any floor, because a finding with no cost shown is one a reader cannot act on.

A candidate below the floor is handed to the invoking agent like a Supported one and filed
nowhere. The report carries the floor that was in force, which is a property of the run and
never of a finding.

### The audiences, ranked by reach

1. Somebody building on the published packages or the scaffold: import shapes, error
   messages, what a new project inherits.
2. The end user of a deployed agent: what it says, how an approval question reads, what a
   failure looks like.
3. Whoever is working inside these repositories.

### A refactor: what it may remove, and how behaviour may change

Code, specs and comments are all candidate surface, and what keeps a refactor honest is the
evidence it has to show rather than a list of things it may not look at:

| what the finding removes | what it must show |
| ------------------------ | ----------------- |
| **code** | the behaviour class below, and the tests covering that code today, by file and test name, with the command that runs them |
| **a spec** | what would still fail if the change were made wrong: the other spec that pins the same rule, named and quoted. Or that the rule it pins no longer exists, shown at `HEAD` |
| **a comment** | which home for that fact survives, and the pointer that reaches it from here. Or the rule the comment itself breaks, quoted from the `AGENTS.md` that states it |

The prior-disposition rule in step 4 protects the **code** a comment explains, not the
comment. **`npm run check` is the whole safety net here**, so a refactor that thins it
without naming what still catches the mistake is not Confirmed.

| behaviour | what it means |
| --------- | ------------- |
| `none` | observable behaviour is identical: the same inputs give the same outputs, the same wire bytes, the same stored state and the same words |
| `little, for the better` | something observable changes, the issue names exactly what and who sees it, and it is an improvement for one of the audiences above |
| `narrowed, with a guard` | a path is removed and a guard clause refuses in its place, naming the limit. Fileable only where the run shows the path is not in use, and the refusal is a sentence the reader can act on |

A behaviour change that is not an improvement is not a refactor: where today's behaviour is
wrong it is a bug, judged by its own row in step 6. `narrowed, with a guard` carries the
hardest bar: no call site, no spec exercising the path, no issue reporting it, and nothing
in `git log` that put it there for a reason still stated.

**Two refactors are `restructure-discovery`'s, and both are handed to it with what was
established rather than dropped.** One is a refactor whose behaviour change is a trade somebody
has to decide: it breaks a consumer, a stored state or a wire contract, renames a public
identifier, or otherwise changes something a consumer or an end user relies on, so that whether
to do it at all is the question rather than how. The other is a refactor whose direction is a
choice between shapes, however small its diff: where picking the shape is the work, what a
reader needs is a proposal carrying its alternatives and its losses, which is not an issue of
this kind.

Neither test is about what the fix costs. **A bug is filed whatever its fix costs**, a release
train and a Durable Object migration included: the defect is real either way, and the issue says
what the fix is likely to need.

### What never goes public

**A security impact is never filed here.** A candidate that would let somebody act beyond
what they were granted, read or leak a credential or another tenant's data, or forge or
replay something the train verifies, goes in no issue, no bundle and no report detail. Hand
it to the invoking agent with what was established, and say that its route is
`security-audit-discovery`'s private advisory. Its report row is `confirmed, not filed` or
`inconclusive`, and says only that a candidate was handed back for the private route.

---

## 8. Three, then depth

**The search stops at the third standalone confirmation.** No wave is opened after it, and
investigations still in flight are abandoned: each is a report row with status
`inconclusive` whose summary says the search had ended, so the next run picks it up rather
than rediscovering it.

**Then the run goes deep on the three.** For each, sweep the whole train for every other site
of the same root cause or pattern: the same copy in another repository, the same omission in
a sibling, the same mistake where its fix did not reach. Verify each new site as step 6 asks,
and add it to the finding. A finding filed with a site missing is how the first fix leaves
the second copy behind. Then sort the sites:

- **the root cause**: the repository and the change that removes it;
- **effects**: sites that follow once the root cause is fixed, a consumer taking a release
  among them;
- **instances that stand on their own**: the same mistake made independently, fixable in one
  repository without the others.

Depth ends when the sweep is done or at `confirm_until`. A run whose search ended at the clock
deepens what it has, in the margin between `open_candidates_until` and `confirm_until`. Small
items depth meets go into their repository's bundle, as in step 5.

**At most three standalone findings are filed.** Bundles sit outside that cap, at most one per
repository per run, and a bundle item never stops the search. The cap is **never** a target:
no floor lowered, no weaker candidate promoted into it, no search widened to fill it. A run
that confirmed fewer than three files fewer and says so without apology.

Ranking decides the order of filing and of the report: the tier first, then reach in the
audience order above, then the cost of leaving it, then the cost of doing it. Between two
refactors of one tier, the one removing more ranks first, and code before a comment or spec
that is pulling its weight.

---

## 9. Before filing: what has already been decided

Per owning repository, read the issues already there with the state filter off, which is
every state this caller can see, then read the ones that look close:

```bash
gh issue list -R dynamicagents/<repo> --state all --limit 200 \
  --json number,title,state,stateReason,labels,url,body
gh issue view <n> -R dynamicagents/<repo> --json title,body,state,stateReason,comments
```

**A listing as full as its limit is not known to be complete.** `gh issue list` returns at
most `--limit` rows and says nothing about any it left out, so a run that gets back exactly
as many rows as it asked for raises the limit and reads again, until the answer comes back
short. Until it does, that repository's history is incomplete and a candidate owned by it is
handed back rather than filed, which is the disposition step 3 gives a refused listing and
for the same reason.

**The second call is not optional.** A closed issue's `stateReason` carries the category and
never the argument, so the reason a decision was made is in its closing comment and nowhere
else. Then apply the disposition table in `AGENTS.md`, under "What earlier runs and earlier
people already decided". Read the code at `HEAD` again as well, because a prior reason is
evidence about the past rather than about today.

**A bundle is read item by item.** Each item is a task-list line: ticked is Done; unticked on
a closed bundle is Declined, unless the closing comment says it moved somewhere; unticked on
an open bundle is Open. A candidate matching an unticked item of an open bundle is filed
nowhere.

Three routes this run has and an advisory-based one does not, and it uses all three:

- **`git log` at the location, and `git log -S` for the condition.** A change tried and
  reverted is a prior decision that no issue ever recorded.
- **The comments at the location**, which are a prior disposition here (step 4).
- **The pull requests that touched the path.** A reviewer may have declined the same change
  in a thread, which is a decision with no issue behind it either.

`deprioritized` in `dev-agents` is a Declined decision whatever its description invites to
do later: the run never reopens anything, and a premise that is now factually false goes to
whoever asked for the run, who may act.

The same listing answers the `Done so far:` line in step 11, so it is read once and used
twice.

---

## 10. File the findings and the bundles

**A finding is filed where its root cause is.** One root cause whose effects reach other
repositories is **one issue**, in the repository whose change removes the cause, even when
the others then follow a release; the effects are a section of that issue. Instances that
stand on their own are an issue per repository, still counted once against the cap.
`dev-agents` takes a finding only when the root cause is in its own files, its skills, its
scripts or its `AGENTS.md`: the train's components hold their own code, and that is nearly
always where a root cause is.

**A bundle is one issue per repository per run**, holding every small, obvious fix this run
met there (step 7). Each item is a task-list line that stands on its own, with its evidence
and its fix, so that one pull request can close the whole bundle and a reader can still
leave one item out. A repository with one item gets a bundle of one. Under a floor raised to
`recurring` there are no bundles: a small fix at `recurring` or above is filed as a
standalone finding instead, and each `local` item is a `below floor` row.

The label is the kind's, from `references/issue-api.md`: `bug`, `documentation` or
`enhancement`. A bundle carries the label of every kind it holds. **The run creates no
label**, milestone or project, and assigns nobody: a repository's configuration is not a
discovery run's to change.

State the issue count before filing any of them, so the volume is never a surprise.

```bash
mkdir -p /tmp/issue-discovery
gh issue create -R dynamicagents/<repo> --label <label> \
  --title "<the root cause, as a sentence>" --body-file /tmp/issue-discovery/<n>.md
```

A standalone finding's body, in this train's house style, which is a bold run-in rather than
a heading:

```markdown
Found by an issue discovery run. Kind: <bug, test, docs or refactor>.

**In short.** What is wrong, who it affects and the suggested fix, in a few sentences, for a
reader who stops here.

**What is there now.** The root cause and every site the run found, each a full-SHA
permalink with a line range.

**Why it matters.** For a bug: what happens, what was expected and where that is written, and
who reaches it on what path. For a test: the regression nothing would catch. For docs: what a
reader would do wrong. For a refactor: the cost already paid, shown, and what it removes, by
kind (code, spec, comment) and unit.

**How to know it is fixed.** For a bug, a test or docs: the command, reproduction or spec
that shows the problem today. For a refactor: the behaviour class and the tests covering the
code today, by file and test name, with the command that runs them. This run wrote no patch,
so none of this is a check it ran on a fix.

**Follow-on in other repositories.** What each repository that feels an effect does once this
is fixed, and in what order. Left out when there is none.

**Suggested direction.** Where the change would go. Not a patch: this run does not write one.

Discovery-Run: <the run's UTC timestamp from step 2>
Discovery-Hypothesis: <the phrase this finding is named by>
```

A bundle's body, titled by what it holds (`Small fixes: <two or three of its phrases>`):

```markdown
Found by an issue discovery run: the small items it met in this repository, gathered so one
pull request can close them. Each item stands on its own. Tick each one the fix covers; an
item left unticked when this closes reads as declined to the next run.

- [ ] **<hypothesis phrase>** (<kind>). What is wrong, at a full-SHA permalink with a line
  range; the command or quotation that shows it; the fix.

Discovery-Run: <the run's UTC timestamp from step 2>
```

**The trailers are the join, and they are readable.** The same `Discovery-Run` appears on
every issue this run files and on this run's rows in the report, and `Discovery-Hypothesis`
names the attempt a standalone finding came from; a bundle names each item's attempt in the
item itself. That is what lets a later run rebuild the rows that filed once the report
carrying them has expired. **No issue numbers are cross-written** between issues of one run:
that would need a second pass that edits an issue, and this run edits nothing. The URLs go in
the report and in the session report instead.

A pull request in another repository that carries a finding's effect refers to it as
`Part of dynamicagents/<repo>#<n>`, and the last as `Fixes dynamicagents/<repo>#<n>`; the
Follow-on section says so, and `references/issue-api.md` says what is known about it.

Then read each issue back by its number and confirm it is there. A refusal stops the run as
in step 3: the prepared bodies stay in `/tmp/issue-discovery/`, the operator gets the exact
status and the UI route, and nothing is published anywhere else. **Outside the repository**
is the requirement and `/tmp` is how it is met: a path inside a checkout is one `git add -A`
away from a commit nobody reviewed.

If the invoking agent asked for report-back-only, file nothing and hand the findings back
instead, each as a `confirmed, not filed` row whose summary says the caller asked for it.

---

## 11. Write one report

One report per run, human- and agent-readable, written once at the end. Its contract, the
rolling table, the `Angles:` and `Done so far:` lines and how history ages out are in
`references/run-report.md`.

The run **produces** the report and writes it to `/tmp/issue-discovery/report.md`, then
hands the text back in the session report. Publishing it where a next run can be briefed
from it belongs to whoever hosts the run, and a local session says plainly that it published
nothing.

---

## 12. Report back

To the invoking agent, in the session: every hypothesis attempted, its kind and angle, and
what happened to each; each standalone finding with its issue URLs and what depth added to
it; each bundle with its URL and items; each Supported candidate and what stopped it; each
candidate below the floor, and each handed back with a question for the owner; anything
handed back for the private route, by that phrase alone; each candidate handed to
`restructure-discovery`, with what was established and why that run owns it; the floor in
force and who set it; whether the search ended at the third confirmation, when the angles ran
out, or at the clock; which repositories were behind their `main`; what the brief did
not carry, which of its links would not open, and what that leaves unknown; and the report
text with its path.

---

<!-- guardrail:start -->
- **Report only.** No fixes, no refactors, no dependency, lockfile or version changes, no
  submodule pointer bumps. A run that applied its own finding is the failure this skill
  exists to prevent, and each of those needs separate explicit authorization from the
  invoking agent.
- Findings go to **public issues in the repository that holds the root cause**, labelled by
  kind. Report-back-only happens when, and only when, the invoking agent asks for it.
- **One finding is one root cause**, filed once where the root cause is, with its effects
  elsewhere as a section of that issue. Only instances that stand on their own are filed per
  repository, and they count once against the cap. Never one record carrying two root causes.
- **Small items go into one bundle per repository per run**, each a task-list item that stands
  on its own. A bundle sits outside the cap, never stops the search, and is never searched
  for.
- **Nothing with a security impact is filed here**, in an issue, a bundle or a report detail.
  It goes back to the invoking agent for `security-audit-discovery`'s private route.
- The run **creates no label**, milestone or project, and assigns nobody.
- **Never a pull request, a branch, a commit or a patch.** A suggested direction is prose.
- **Only a Confirmed finding is filed, and impact never promotes a class.** A candidate
  the run has not verified itself, or that rests on a worker's claim, is reported to the
  invoking agent and filed nowhere.
- **A discovery run writes no patch, so it never establishes that a change is
  behaviour-neutral.** It establishes the root cause, the cost, what would change and what
  covers the code today.
- **Every line is candidate surface**, code, specs and comments alike, and no kind is
  removed without its row of the surface table: for code the behaviour class and the tests
  that cover it, for a spec the other spec that still pins the rule, for a comment the home
  that survives.
- **A constraint the code already states is a prior disposition**, and that protects the
  code a comment explains, not the comment.
- **At most three standalone findings are filed in a run, and the search stops at the third.**
  The run then goes deep on those three, not wide on more. The cap is never a target: a run
  that confirmed fewer says so, and no search is widened to fill it.
- **`min_tier` starts at `local`, and only an explicit instruction from the invoking agent
  raises it, and only to `recurring`.** Never lowered, and never moved by an empty run, absent
  history, a deadline or an unfilled cap. `cosmetic` is never filed at any floor.
- **A breaking refactor is out of scope**, and so is a refactor whose direction is a choice
  between shapes. Each is **handed to `restructure-discovery` with what was established**, never
  filed here and never dropped. A bug is filed whatever its fix costs, a release train and a
  Durable Object migration included.
- **One report per run**, describing that run only. Never a tracking issue, never an omnibus
  thread, never an edit to a report already handed over.
- The skill **never closes, reopens, edits or comments** on an issue, a pull request or an
  advisory, its own records included. Closing is the owner's. History is never filtered by
  state.
- **Never read, echo, log or copy a credential.** Capability is established by response
  codes alone.
- **Every checkout is left as it was found.** A command that can write is not run in a
  checkout that was already dirty, and a checkout the run did not find clean is never
  restored, stashed or checked out: destroying somebody's uncommitted work is changing
  source. The run's own writes are limited to: the issues of a confirmed finding, the bundles,
  the report it hands back, and files under `/tmp/issue-discovery/`.
<!-- guardrail:end -->

## References

- `references/issue-api.md`: the issue calls, the permission each needs, the label per kind,
  what was measured against each, and the ways the issues endpoint misleads a reader.
- `references/run-report.md`: the report's contract, the rolling table and its fixed status
  vocabulary, the `Angles:` and `Done so far:` lines, and what survives when an artifact
  expires.
