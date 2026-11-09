---
name: restructure-discovery
description: >-
  Go looking for the better way: a decision the train made once, under facts that have since
  moved, where another direction would serve the long term better. Reads the decisions these
  repositories write down, re-checks each stated premise against the code at HEAD and against
  what has shipped upstream, reads outside this workspace, and files at most three proposals
  as public GitHub issues in the repository that owns the decision. Each carries where we are
  now, a forecast of the gain against the loss with the class of evidence behind every claim,
  a metric chosen for it and how it is re-evaluated, and the reversal cost. Discovery only:
  it writes no fix and no pull request, and never carries out the restructuring it proposes.
  Use when asked what the train should do differently, or for a strategic or
  direction-setting discovery round. Not a bug or a cleanup, which is `issue-discovery`'s,
  not a security weakness, which goes to a private advisory, and not a review of a branch's
  diff.
disable-model-invocation: true
---

# Restructure discovery

**This run looks for a better way, not for a wrongness.** Nothing it files is broken today.
What it files is a decision worth taking again, because the facts the first one rested on have
moved: a mechanism we maintain that an upstream dependency now covers, a value two sides keep
in step by hand, a boundary in the wrong repository, a concept to add, collapse or reshape,
a route a new project takes before any of this is installed.

The unit of work is an **attempt**: a named hypothesis about one decision and what has changed
since, tested against the code and against the world until it is confirmed or dropped. A run
makes its attempts in small waves, keeps the best three, and spends the rest of its window
making each one a brief somebody can decide from.

**It proposes and it never implements.** Carrying out a restructuring is a separate piece of
work that the owner authorizes after reading the proposal, and a run that started one has
stopped being a discovery run.

Triggered by a person, or by the Coordinator on a person's behalf. Nothing schedules it.

The workspace `AGENTS.md`, under "Discovery runs", carries the evidence gate, the ranking axes,
the disposition table, the citation rule, the cap and the rules against edits and against
reading a credential. Read it first; this file carries what is specific to this run.

**What it is not.** Not `simplify` or `code-review`, which are Claude Code built-ins scoped to a
branch's diff. Not `security-audit-discovery`: anything with a security impact leaves this run
by the private route in step 7. And not `issue-discovery`, which is the boundary worth getting
right, so step 7 states it as one question and says what that question is not.

---

## What the run reads

**Both workspaces.** The train is the checkout this session starts in, `dev-agents` and its
submodules. The gates are the other side of the crossing the train is reached through, and
several of the decisions worth revisiting are about that crossing, so the run clones them
rather than reasoning about a repository it has not read:

```bash
mkdir -p /tmp/restructure-discovery
gates=$(mktemp -d /tmp/restructure-discovery/dev-gates.XXXXXX)
git clone --recurse-submodules --remote-submodules https://github.com/dynamicagents/dev-gates "$gates"
```

The clone goes under that directory because it is the one place this run writes (the guardrail
block), and it is outside every checkout. It goes in a directory of its own, because the
directory outlives a run and `git clone` refuses one that is not empty. The run keeps the path
`mktemp` printed. `--remote-submodules` puts each submodule at its declared branch's tip rather
than at dev-gates' pin, which lags `main` by design while the gatekeeper deploys `main`.

**Name the commit read in every repository**, both workspaces (`git -C <dir> rev-parse HEAD`).
A permalink cites it, the report's `Read at:` line carries it, and a proposal about a boundary
read against a stale checkout is a proposal about last month's boundary.

---

## 1. The brief

A run holds no state between runs. Everything it knows about earlier attempts arrives in the
prompt that starts it:

```yaml
history: <url>           # the most recent report's link, or absent. Open it for the table
history_state: complete  # complete, incomplete or reconstructed
prior_reports: []        # up to four older, unexpired links: the detail, and the fallback
deadline: <ISO-8601 UTC> # optional. Absent means the run computes its own in step 2
```

There is no floor to pass in, and no dial a caller turns: what decides whether a proposal is
filed is the pair of bars in steps 6 and 7, the forecast and the scope, and both are the same
for every run of this skill.

**The run reads the history the brief names, and goes looking for none of its own.** The rolling
table is not copied into the brief: `history` is a link, and the run opens it and reads the
table out of the report behind it. That is a read of a page and not a call to a store
(`AGENTS.md`, under "A run is briefed, and keeps nothing").

- **A link that yields no table is unknown history, never a clean window.** A record past its
  retention, a link that arrived wrong, a host answering with a page no table can be read out
  of: each leaves this run without the window it was meant to have, and **no status code tells
  them apart**, because a host may answer `200` with a page that holds nothing. What decides it
  is whether a table came back. Say which link failed.
- **Absent history is not evidence of novelty.** An attempt the window does not show is unknown,
  not new. Say which it is, and never present a thin window as a clean one.
- `prior_reports` is the detail behind the table, opened when it would change what this run
  does, and as the fallback where `history` yielded nothing.

**This run has a second history the report cannot give it, and it is the better half.** Its
records are public issues that never expire, so what was *filed* is readable at any time from
the repositories themselves (step 9). The report says what was **attempted**, which is the part
that exists nowhere else: every decision this run re-checked and left standing leaves no issue
behind, and that row is the one a later run most wants. Neither store is the other's index, so
say which of the two answered a question.

---

## 2. One clock, shared

Take the run's timestamp and its deadline once, at the start, in UTC. The deadline goes verbatim
into every brief this run hands out: two workers must never disagree about when to stop. The
timestamp is this run's id and stays with the orchestrating run: a worker files nothing, so it
has no use for one.

```bash
date -u +%Y-%m-%dT%H:%M:%SZ                                 # Restructure-Run: this run's id
date -u -d '+<window_minutes> minutes' +%Y-%m-%dT%H:%M:%SZ  # the deadline, if the brief named none
date -u -v+<window_minutes>M +%Y-%m-%dT%H:%M:%SZ            # the same, where date is BSD's and -d is not a flag
```

```yaml
# The run's one clock. Minutes, UTC, computed once and shared verbatim. `window_minutes`
# is where the deadline above comes from, and the only place that number is written.
window_minutes: 90        # the start of research to the deadline
open_candidates_until: 40 # minutes before the deadline: no wave is opened after it
confirm_until: 25         # minutes before the deadline: confirmation and depth stop here
```

**The margins are wider than the other runs', and the window is the same.** What is expensive
here is not the sweep but the brief: the metric, the class behind each claim, the reference
projects, the losses and the reversal cost are all written after the search closes, and three of
them have to fit before the deadline. So the search gets the first stretch and the writing gets
the rest.

**The window is a ceiling, not a target.** The search ends at the third confirmation (step 8),
when no move is left to take (step 4), or at `open_candidates_until`, whichever comes first;
depth on what was kept ends when it is done or at `confirm_until`. Filing a confirmed proposal,
writing the report and handing the session back all complete after the deadline has passed,
because a clock that could stop a confirmed proposal from reaching its issue would throw away
work already paid for.

A deadline is **never** a reason to weaken the evidence bar or file a proposal steps 6 and 7
did not clear. Running out of time means a run with fewer proposals, and the report says where the clock
bit.

A brief may name a deadline closer than `open_candidates_until`. The margins are absolute
minutes before it, not fractions of the window, so there is then no room to open a candidate
that could ever be confirmed. Open none, report the window as too short to research in, and
stop.

---

## 3. Check the capability before spending the window

Three probes, all before anything is researched.

**The issue routes.** The create probe makes nothing, because the body has no `title` and the
endpoint requires one. A `422` is the green light: the endpoint accepted the caller and rejected
the body.

```bash
# Create path, per candidate destination repository. `issues=write`.
echo '{}' | gh api -i --method POST repos/dynamicagents/<repo>/issues --input -

# Read path, the same repositories. `issues=read`.
gh api -i "repos/dynamicagents/<repo>/issues?state=all&per_page=1"
```

`-i` is load-bearing: without it `gh` prints the body and the status and swallows the response
headers, and `X-Accepted-Github-Permissions`, the permission GitHub says the endpoint wanted, is
the only thing that separates a missing permission from a missing role.

**A refused create stops the run for that repository**, and **every create refused stops the
run**: there is then nothing this session could do with a proposal. Report which endpoint
refused and what that header asked for, say that a session's credential is not the Worker's
`GITHUB_TOKEN` binding (separate paths, so a scope granted to the deployment does not reach a
CLI session), and ask for it to be fixed. Do not research on in the hope it clears.

A refused listing stops less than a refused create. Without it step 9 cannot run, and a proposal
filed with no history behind it is how a decision somebody already made gets proposed again. So
a candidate owned by a repository whose listing is refused is researched like any other and
handed back with its prepared body, never filed blind. Its report row is `confirmed, not filed`.

**The label.** Read what each destination carries, and decide from the answer rather than from
an assumption:

```bash
gh label list -R dynamicagents/<repo> --limit 100 --json name --jq '[.[].name] | index("restructure")'
```

A proposal is labelled `restructure` where that label exists and `enhancement` where it does
not, and the report names every destination that fell back. The run creates neither: a
repository's configuration is not a discovery run's to change (`AGENTS.md`, under "What a
discovery run never does"). Which label a bundle takes is its kind's, and that table has one
home, in `../issue-discovery/references/issue-api.md`.

**The web.** Outside reading is required of every proposal (step 6), so a run that cannot reach
the web has nothing it may file, and finding that out after the window is spent wastes the
window. Fetch a documentation page this run expects to cite, such as the Cloudflare Agents or AI
SDK documentation the train is built on. The first page that answers with text is the green
light, and the report names which page answered.

**No page answering stops the run.** File nothing, report which probe failed and that the run
was hosted without the web access every proposal requires, and hand back whatever the session
established. Do not file on the repositories and the registry alone: that is the degradation
this probe exists to refuse.

Capability is read from status codes and from whether a page came back. **Never read, echo, log
or copy a credential.**

---

## 4. Read the decisions, then form the hypotheses

**The decisions are written down, and that is this run's advantage.** These repositories state
their constraints with the reason beside them, and several say outright what would reverse them.
Where to read them, in this order:

- **Every `AGENTS.md` in the train and in the gates.** A section that states a rule and the
  measurement or coupling behind it is a decision with its premise attached.
- **The comments at the location.** They are held to the code's bar here and record what was
  expensive to learn, so a comment stating a constraint is a prior disposition: the rule below
  says what it takes to show one has moved.
- **Merged pull request bodies.** `dev-agents` carries the train's design history, and each
  repository carries its own. A body that argues for a shape is the decision in its own words.
- **Closed issues with their closing comments.** A declined decision lives there and nowhere
  else: `stateReason` carries the category and never the argument.
- **`git log -S` for a change tried and reverted**, which is a decision no record ever carried.

**A premise is what a hypothesis is aimed at.** The question is never "is this shape nice" but
"is the reason this shape was chosen still true". A candidate that names a shape somebody would
prefer, with no premise behind it and no change to point at, is not a hypothesis and the window
is not spent on it.

**A constraint the code already states stands until the run shows it has moved.** Reading past
it is how a window is spent rediscovering decisions. Showing it has moved means the stated
reason quoted and the fact that contradicts it, read at `HEAD` or upstream, not recalled.

### The moves, and how they rotate

A move is the kind of change a hypothesis proposes. Each one finds a different sort of
opportunity, and a run that keeps to the same ones proposes what the last run proposed. So every
hypothesis records its move, the report counts what each produced, and the next run reads that
count before it picks.

- **adopt instead of own**: code we maintain that an upstream dependency now covers.
- **own instead of adopt**: a dependency whose cost or drift now exceeds what owning it would
  cost. This move exists so the first one is not a one-way ratchet.
- **extract a shared home**: a value, a contract or a protocol that two sides keep in step by
  hand.
- **move a boundary**: a thing living in the wrong repository, package, subpath or Durable
  Object, held against the workspace "Where a change goes" table and each repository's own line.
- **merge or split a unit**: two things that always change together, or one thing carrying two
  unrelated reasons to change.
- **reshape a concept**: a name the code keeps working around, a concept several places
  open-code, a concept to collapse into another.
- **change how a consumer starts**: what a new project inherits, and by what route.
- **reuse across a boundary**: something one side of a crossing already has that the other
  duplicates.
- **re-check a stated premise**: a written decision whose own reason names what would reverse
  it, held against today's facts. The most productive move this train offers, because the
  reversal condition is already written.

**The rotation rule.** The first wave always re-checks premises from decisions the previous
report's `Decisions read:` line does not name, and takes at least one move its `Moves:` line
does not show; where it used every move, the one it confirmed least from stands in. No later
wave repeats a move of this run unless that move produced a confirmation. **When no move is left
to take, the search is over**, however much window remains: step 8 deepens what was confirmed,
and the report says the moves ran out. A run handed no report has no `Decisions read:` line to
work from and no moves to avoid: it says so, and takes any moves it likes in their place.

**The re-attempt rule is two-sided, and that is this run's own.** A hypothesis the table holds
as `ruled out` or `prior decision` is reopened when either side of it has moved:

```bash
git log --since=<its run (UTC)> -- <the paths its summary names>   # our side, per repository
gh api repos/<owner>/<name>/releases --jq '.[0] | .tag_name, .published_at'
npm view <package> version                                        # what is published now
```

A premise-checking run whose re-attempt test read only our own code would never notice the
change that matters most, which is the one that happened upstream. A row whose summary names no
path and no upstream fact is reopened only by reading what it describes, and the report says
which rows were judged that way. A row handed back for the private route is never reopened here.
A row marked `inconclusive` or `forecast too thin` is fair game, and its summary says what it
needs.

### The hypothesis phrase

Each attempt gets a short readable phrase naming the decision and what has changed, and it is
the name that attempt keeps: the first column of the report table, and the stable key a later
run recognises it by. **It may name a repository, a module and a path**, because this run's
records are public.

**Novelty is a judgment, not a key.** Hold the phrase against the table the history link carried
and against the issues step 9 lists, and ask whether that decision has been attempted: the same
decision under different words is a repeat, a different decision is new. No taxonomy, no hash,
and no pretending that history nobody handed you proves anything.

---

## 5. Investigate in small waves

A **wave** is up to three hypotheses, one investigator each, opened together. Three is the
ceiling because every claim that comes back has to be verified by the run itself (step 6), and
that verification is the narrow part: more workers buys queued claims, not proposals.

After each wave the run verifies what came back, tests it against step 7, and then decides:

- **three proposals confirmed**: the search is over, and step 8 takes the run deep;
- **fewer**: open the next wave, from moves the rotation rule still allows;
- **no move left, or `open_candidates_until` reached**: no further wave; step 8 deepens what was
  confirmed.

One investigator takes one candidate, and its brief stands on its own: a skill with
`disable-model-invocation: true` is not preloaded into a subagent (`AGENTS.md`, under "The prompt
names the skill"), so nothing in the brief may assume the subagent can read this file. A worker
brief carries the hypothesis phrase and its move, the decision to read and where it is written,
which alternatives to establish, the run's deadline verbatim, what counts as the present state
and what each evidence class takes (step 6), the outside reading it owes and the citation form
for each route, and the rules it works under: change nothing, file nothing, publish nothing,
propose no work it then starts, and never read, echo, log or copy a credential. Filing is the
orchestrating run's alone.

**Depth, not more workers.** A candidate still unresolved after it has been read carefully is
Supported and drops out of filing. A second investigator on it buys a second opinion, which is
not evidence.

**What a wave meets on the way is kept.** A wrongness an investigator passes while chasing its
hypothesis, a wrong comment, a dead pointer, a spec that asserts nothing, is recorded with its
evidence for its repository's bundle (step 10). The run never opens a wave to look for bundle
items: they are what it bumps into, not what it is for.

---

## 6. The run verifies, the worker does not

A subagent's report is a **claim**, and a claim is not evidence. Before a proposal can be filed,
the orchestrating run re-reads the code at `HEAD` itself, re-runs whatever the claim rests on,
and opens every citation, naming the commit it read.

A proposal's case has two halves and they are not the same kind of claim.

**Where we are now** is established, not predicted: what is there today and what it costs us, by
a named command and its output or by full-SHA permalinks with line ranges. A reader re-runs
this. It is the half that satisfies the shared evidence gate (`AGENTS.md`, under "Evidence first:
the gate").

**The forecast** is what the change would buy and what it would cost. **A forecast is not a
measurement, and it says which it is.** The run never confirms a prediction and never needs to:
what makes a proposal fileable is that every claim in the forecast names the class of evidence
behind it, and that at least one gain is a class a reader can check for themselves.

| class | what it takes |
| ----- | ------------- |
| `measured` | the metric is countable in the tree today and the change's effect on it is arithmetic over what exists. A named command and its output |
| `demonstrated` | a named reference project made the same move, and what it bought is visible in its tree, its release notes or its issue history. Permalinks, or URLs with the date read |
| `derived` | the claim follows from a constraint written down here plus a fact established at `HEAD` or upstream, with no step the reader has to take on trust |
| `judged` | it rests on a step nobody can check. Labelled as such rather than written up as one of the three above |

**At least one gain is `measured` or `demonstrated`.** Those are the two a reader can re-check
without trusting the run, which is why the decisive gain is always one of them. **A proposal
with no `measured` and no `demonstrated` gain is not filed**, whatever else it has: a forecast
resting on `derived` reasoning, on `judged` opinion, or on a mixture of the two is a case a
reader has to take the run's word for. It goes to the invoking agent with what was established
and with the measurement or the reference that would make it checkable, and its report row is
`forecast too thin`.

**A class is a kind of evidence, not a degree of belief, and no rating goes beside it.** No
percentage, no score, and no qualitative confidence either: "likely", "fairly confident" and
"high confidence" are not classes and never stand in for one. A model's number for its own
certainty is not a probability, and a published bar becomes something to clear rather than a
test to pass, which is why the shared gate refuses one. The class carries what a reader needs
because it names the artifact they can open.

`references/forecast.md` is the home of what each class takes, how a metric is chosen and
re-evaluated, and the citation form for each outside route.

**Outside reading is owed by every proposal**, and it is how `demonstrated` is earned. A claim
about an upstream library taken from memory is `judged` at best: a version is read, not recalled.
A page never carries the present-state measurement, because a page is not re-checkable the way
our own tree is.

Reading every repository in the train at a pinned combination adds rules:

- **Name the commit per repository, and say when a checkout is behind.** A decision read against
  a stale checkout may already have been taken. Compare what was read with
  `gh api repos/dynamicagents/<repo>/commits/main --jq .sha` and report any that differ.
- **Measurements run outside every checkout**, under `/tmp/restructure-discovery/`, from plain
  copies. A harness that copies into a directory symlinked into a checkout writes into that
  checkout, so confirm `find -type l` is empty under the staging directory before running
  anything there.
- **Leave every checkout as you found it, which is not the same as leaving it clean.** Prefer
  `git`, `rg` and `gh`, which write nothing. Some commands do write: starter's `npm run check`
  runs `wrangler types`, and a playback run has dirtied core's cassettes before. Before running
  one of those, read `git status` in that checkout:
  - **Already dirty: do not run it there.** Somebody's uncommitted work is in the way, and after
    the command the run cannot tell their changes from its own, so the one rule it could follow
    next, restore, is the one that would destroy their work. Read that repository with read-only
    commands instead, and say in the report which checkout was dirty and what went unrun.
  - **Clean: run it, then read `git status` again and restore what the command wrote.** Here a
    restore is safe precisely because the checkout had nothing to lose.

  Never `git checkout`, `git restore` or `git stash` across a checkout the run did not find
  clean. A discovery run that destroys uncommitted work has changed source, which is the one
  thing it may never do.

Stop confirming at `confirm_until`. A candidate still unconfirmed when the clock reaches it is
Supported, and the report says the clock decided it.

---

## 7. What this run proposes, and what it never does

### The boundary is one question

**Does the finding say "this is wrong", or "there is a better way"?**

- **Wrong is `issue-discovery`'s.** Something that does not do what it promises, or surface we
  are already paying for whose removal is obvious once it is seen. The improvement there is
  correctness restored or a cost already incurred taken away, and the output is a fix somebody
  merges.
- **A better way is this run's.** A direction that would serve the long term better than
  today's, where choosing it is the work and the case is a forecast. The improvement is in how
  future work goes, and the output is a proposal the owner approves or declines.

**What the question is not**, because each of these was tried as a test and each one misroutes:

- not the effort the change would take;
- not whether it needs a release train, or how many repositories publish in what order;
- not the size of a migration;
- not whether a published surface moves;
- not how many call sites, files or repositories the diff touches;
- not which structural pattern the diff matches.

Every one of those is a property of a fix rather than of the question being asked. A bug whose
fix needs a release train and a Durable Object migration is still a wrongness and still
`issue-discovery`'s. A better way that is one line in one manifest is still a decision and still
this run's. The clearest case is a dependency: one that is missing, or one nothing imports any
more, is a wrongness; one we would swap, drop or adopt because we believe it serves the long term
better is a decision. Same edit, different question.

The two runs do read differently in practice, the other sweeping rotating angles for many
candidates and this one going deep on few while reading outside the repositories. That is a
consequence of what each searches for. It is never the test.

### Nothing is dropped at the boundary

Three dispositions, and every one of them ends in something:

1. **A better way whose forecast holds**: filed here as a proposal (step 10).
2. **A wrongness this run met on the way**: a **bundle** item, one issue per repository per run,
   each item a task-list line that stands on its own, labelled by its kind. It sits outside the
   cap, never stops the search, and is never searched for.
3. **Too large for a bundle item**: a wrongness whose fix needs its own review, or a better way
   whose forecast will not hold up, goes to the invoking agent with everything that was
   established and the question named, and into the report table with its evidence, so the next
   run or the caller can act without buying the work again.

**Doubt resolves towards recording.** A candidate the run cannot confidently place is a bundle
item when it is small and a hand-back when it is not. It is never left unrecorded because its
owner was unclear. This run files no standalone defect issue of its own, which keeps
`issue-discovery` the owner of that kind while still leaving the finding somewhere a person can
read it.

### What a proposal may change, and what it may not

**A proposal adds no feature and removes nothing a consumer or an end user relies on.** The
target is a stronger foundation, which is what makes the next piece of business logic or the
next client project cheaper to build, and that is a different thing from either growing the
product or shrinking it.

- A **concept, an abstraction, a mechanism or a duplicate** may be removed, merged or reshaped.
- **A capability somebody depends on may not**: not an import a consumer holds, not a behaviour
  an end user meets, not a route a deployment runs on. Where a proposal would change one, it is
  a migration of that capability and the proposal says what replaces it and when.
- Where observable behaviour changes at all, the proposal **names exactly what changes and who
  sees it**, in the losses rather than in the gains.

### The losses are part of the case

A proposal with no losses named is a sales pitch. Where the run can find none it says what it
looked for and failed to find, which is at least: a consumer that breaks, work that gets harder,
something foreclosed, and the cost of reversing it. **The reversal cost is always named**, with
what undoing the change would take and what would have been built on top of it by then.

**The run claims no net figure.** It states the trade in one sentence, in the form "we take X to
stop paying Y", makes both sides legible with their classes, and leaves the decision to the
owner. A balance presented as arithmetic over things that are not commensurable is the dishonest
version of this.

**The ordering rule covers the whole record, the opening included.** A recommendation stated
before the losses makes every loss after it read as an objection to be answered rather than a
cost to be weighed, and a summary at the top is the easiest place to do that by accident. So
the opening carries the opportunity and the trade, which is both sides in one breath, and the
recommendation appears once, inside the alternatives, after what the change would cost.

**Doing nothing, and the smallest version that captures most of the gain, are always among the
alternatives.** Without the second one the comparison is against the whole proposal rather than
against the margin, which is where most of these decisions actually turn.

### What never goes public

**A security impact is never filed here.** A candidate that would let somebody act beyond what
they were granted, read or leak a credential or another tenant's data, or forge or replay
something the train verifies, goes in no issue, no bundle and no report detail. Hand it to the
invoking agent with what was established, and say that its route is `security-audit-discovery`'s
private advisory. Its report row is `confirmed, not filed` or `inconclusive`, and says only that
a candidate was handed back for the private route.

---

## 8. Three, then depth

**The search stops at the third confirmed proposal.** No wave is opened after it, and
investigations still in flight are abandoned: each is a report row with status `inconclusive`
whose summary says the search had ended, so the next run picks it up rather than rediscovering
it.

**Then the run goes deep on the three**, and depth here is the brief rather than a wider sweep:

- the metric this proposal is judged on, why that one, and how it is re-evaluated afterwards;
- the class behind every gain and every loss, each checked by the run itself;
- the reference projects, read and cited, which is where `demonstrated` comes from;
- the alternatives, with doing nothing and the smallest useful version among them;
- the losses, the reversal cost, and who feels each;
- the effects in other repositories, and in what order they would follow.

Depth ends when it is done or at `confirm_until`. Small items depth meets go into their
repository's bundle, as in step 5.

**At most three proposals are filed.** Bundles sit outside that cap, at most one per repository
per run, and a bundle item never stops the search. The cap is **never** a target: no bar
lowered, no weaker candidate promoted into it, no search widened to fill it. A run that
confirmed fewer files fewer and says so without apology, and three inside ninety minutes will
often mean fewer.

**Ranking decides the order of filing and of the report**, and the keys are about the case rather
than the diff:

1. **the trade**: how much the gain recurs against what the loss costs, and how often each is
   paid. This is the shared "cost of leaving it" and "cost of doing it" axes read against each
   other rather than scored apart;
2. **reach**, in the audience order the workspace `AGENTS.md` sets under "Three, and ranking";
3. **how checkable the decisive gain is**: `measured`, then `demonstrated`, then `derived`. A
   tie-break and not the lead, because checkability is already the filing gate in step 6, and
   leading with it would both count it twice and read as an order of confidence, which this run
   does not report;
4. **the reversal cost**, with the easier to undo first where two are otherwise equal.

No weights and no total. State the order and the sentence that decided each adjacent pair.

---

## 9. Before filing: what has already been decided

Per owning repository, read the issues already there with the state filter off, which is every
state this caller can see, then read the ones that look close:

```bash
gh issue list -R dynamicagents/<repo> --state all --limit 200 \
  --json number,title,state,stateReason,labels,url,body
gh issue view <n> -R dynamicagents/<repo> --json title,body,state,stateReason,comments
```

**A listing as full as its limit is not known to be complete.** `gh issue list` returns at most
`--limit` rows and says nothing about any it left out, so a run that gets back exactly as many
rows as it asked for raises the limit and reads again, until the answer comes back short. Until
it does, that repository's history is incomplete and a candidate owned by it is handed back
rather than filed, which is the disposition step 3 gives a refused listing and for the same
reason.

**The second call is not optional.** A closed issue's `stateReason` carries the category and
never the argument, so the reason a decision was made is in its closing comment and nowhere
else. Then apply the disposition table in `AGENTS.md`, under "What earlier runs and earlier
people already decided". Read the code at `HEAD` again as well, because a prior reason is
evidence about the past rather than about today.

**A bundle is read item by item.** Each item is a task-list line: ticked is Done; unticked on a
closed bundle is Declined, unless the closing comment says it moved somewhere; unticked on an
open bundle is Open.

**A declined proposal is the hard case, and it stays declined.** The only unlock is a premise
that is now factually false: quote the stated reason and show the code, the release or the
registry fact that contradicts it, in the new record, which names the prior one. A reason that
was a preference stays closed and the report says so. **Never reopen** anything, and never
comment on it.

Three routes this run has and an advisory-based one does not, and it uses all three:

- **`git log` at the location, and `git log -S` for the condition.** A change tried and reverted
  is a decision no issue ever recorded.
- **The comments at the location**, which are a prior disposition here (step 4).
- **The pull requests that touched the path.** A reviewer may have declined the same direction
  in a thread, which is a decision with no issue behind it either.

`deprioritized` in `dev-agents` is a Declined decision whatever its description invites to do
later: the run never reopens anything, and a premise that is now factually false goes into a new
record or to whoever asked for the run.

The same listing answers the `Done so far:` line in step 11, so it is read once and used twice.
What that listing can and cannot establish is in step 11: it carries a label and a state, and
not who applied either.

The call mechanics, the permission each needs, the label per kind and the ways the issues
endpoint misleads a reader have one home, and this run reads it rather than restating it:
`../issue-discovery/references/issue-api.md`. **Read its trailers as this run's.** Where it
says to search for a run's own trailer before retrying a create that answered with an error,
the trailer to match here is `Restructure-Run`: searching for a sibling's spelling matches
nothing, which reads exactly like a create that did not land and is how one proposal gets two
issues.

---

## 10. File the proposals and the bundles

**A proposal is filed where the decision is owned.** One decision whose effects reach other
repositories is **one issue**, in the repository whose change takes the decision, even when the
others then follow a release; the effects are a section of that issue. `dev-agents` takes a
proposal about the train as a whole, about the crossing with the gates, or about this workspace
and its own files, which is what its `SECURITY.md` scope and the workspace `AGENTS.md` already
say for a finding no single component owns. A decision the gatekeeper alone owns goes to its own
repository.

**A bundle is one issue per repository per run**, holding the wrongness this run met there, each
a task-list line that stands on its own with its evidence and its fix, so that one pull request
can close the whole bundle and a reader can still leave one item out. A repository with one item
gets a bundle of one.

State the issue count before filing any of them, so the volume is never a surprise.

```bash
mkdir -p /tmp/restructure-discovery
gh issue create -R dynamicagents/<repo> --label <restructure, or enhancement where it is absent> \
  --title "<the decision and the direction, as a sentence>" \
  --body-file /tmp/restructure-discovery/<n>.md
```

A proposal's body, in this train's house style, which is a bold run-in rather than a heading:

```markdown
Found by a restructure discovery run. Move: <the move>. This is a proposal for a decision and
not an approved change: nothing here is work to start before the owner decides.

**In short.** The opportunity and the trade in one sentence, for a reader who stops here. Not
the recommendation: that is argued below, after what it would cost.

**The decision as it stands.** What is there now, and the decision that put it there, quoted
from where it is written, with a permalink. Where no decision is written down, say so.

**Where we are now.** The present state and what it costs us, by a named command and its output
or by permalinks. Measured, not forecast.

**What changed.** The facts that moved since the decision: an upstream API that landed, a
dependency that now covers this, a cost paid again, a constraint that no longer holds. Each
cited and re-read at HEAD.

**The forecast.** The metric this proposal is judged on and why that one, the expected effect on
it, the evidence class behind each claim (`measured`, `demonstrated`, `derived` or `judged`), and
how the metric is re-evaluated afterwards to see whether this held.

**What it would cost us.** Each loss with its own class, who feels it, and the reversal cost:
what undoing this would take, and what would have been built on top of it by then. Written
before the recommendation below.

**The alternatives.** Each with what it gets, what it costs and what it gives up. Doing nothing,
and the smallest version that captures most of the gain, are both here. Then the one this run
recommends, and the sentence that decided it against its nearest rival.

**If it goes well.** A year out, what the train looks like having done it, and what became easier
to build.

**If it goes badly.** The honest case against: what is lost, what gets harder, what this
forecloses, and what the reversal would take.

**Outside reading.** What was read beyond these repositories, each with its citation, and which
of it is a page that may have moved since.

**Follow-on in other repositories.** What each repository that feels an effect does, and in what
order. Left out when there is none.

Restructure-Run: <the run's UTC timestamp from step 2>
Restructure-Hypothesis: <the phrase this proposal is named by>
```

A bundle's body, titled by what it holds (`Small fixes: <two or three of its phrases>`):

```markdown
Found by a restructure discovery run: the small, obvious fixes it met in this repository while
researching proposals, gathered so one pull request can close them. Each item stands on its own.
Tick each one the fix covers; an item left unticked when this closes reads as declined to the
next run.

- [ ] **<hypothesis phrase>** (<kind>). What is wrong, at a full-SHA permalink with a line
  range; the command or quotation that shows it; the fix.

Restructure-Run: <the run's UTC timestamp from step 2>
```

**The trailers are the join, and they are readable.** The same `Restructure-Run` appears on every
issue this run files and on this run's rows in the report, and `Restructure-Hypothesis` names the
attempt a proposal came from; a bundle names each item's attempt in the item itself. That is what
lets a later run rebuild the rows that filed once the report carrying them has expired. **No
issue numbers are cross-written** between issues of one run: that would need a second pass that
edits an issue, and this run edits nothing. The URLs go in the report and in the session report
instead.

Then read each issue back by its number and confirm it is there. A refusal stops the run as in
step 3: the prepared bodies stay in `/tmp/restructure-discovery/`, the operator gets the exact
status and the UI route, and nothing is published anywhere else. **Outside the repository** is
the requirement and `/tmp` is how it is met: a path inside a checkout is one `git add -A` away
from a commit nobody reviewed.

If the invoking agent asked for report-back-only, file nothing and hand the proposals back
instead, each as a `confirmed, not filed` row whose summary says the caller asked for it.

---

## 11. Write one report

One report per run, human- and agent-readable, written once at the end. Its contract, the rolling
table, the `Moves:`, `Decisions read:`, `Outside reading:` and `Done so far:` lines and how
history ages out are in `references/run-report.md`.

The run **produces** the report and writes it to `/tmp/restructure-discovery/report.md`, then
hands the text back in the session report. Publishing it where a next run can be briefed from it
belongs to whoever hosts the run, and a local session says plainly that it published nothing.

---

## 12. Report back

To the invoking agent, in the session: every hypothesis attempted, its move and the decision it
was aimed at, and what happened to each; each proposal with its issue URL, its metric and the
class behind its decisive gain; each bundle with its URL and items; each candidate whose forecast
was too thin and what would thicken it; each candidate handed back and the question it carries;
anything handed back for the private route, by that phrase alone; which destinations fell back to
`enhancement`; what the outside reading reached, which page answered the web probe, and what it
could not reach; which repositories were behind their `main`; whether the search ended at the
third confirmation, when the moves ran out, or at the clock; what the brief did not carry, which
of its links would not open, and what that leaves unknown; and the report text with its path.

---

<!-- guardrail:start -->
- **Report only.** No fixes, no refactors, no dependency, lockfile or version changes, no
  submodule pointer bumps. **A run never carries out a restructuring it proposes**, and each of
  those needs separate explicit authorization from the invoking agent.
- Proposals go to **public issues in the repository that owns the decision**, labelled
  `restructure` where that label exists and `enhancement` where it does not, with the report
  naming every destination that fell back. Report-back-only happens when, and only when, the
  invoking agent asks for it.
- **One proposal is one decision**, filed once where the decision is owned, with its effects
  elsewhere as a section of that issue. Never one record carrying two decisions.
- **A proposal adds no feature and removes nothing a consumer or an end user relies on.** A
  concept, an abstraction, a mechanism or a duplicate may be reshaped; a capability somebody
  depends on may not.
- **The boundary is the kind of search and the kind of improvement**, never the effort, the
  release train, the size of a migration, how many repositories are touched, whether a published
  surface moves, or the pattern the diff matches. A wrongness is `issue-discovery`'s whatever
  its fix costs.
- **No candidate is dropped for not fitting the boundary**: it is a proposal, a bundle item, or
  a hand-back with the question named and its evidence attached.
- **Small items go into one bundle per repository per run**, each a task-list item that stands on
  its own. A bundle sits outside the cap, never stops the search, and is never searched for.
- **A forecast is not a measurement, and it says which it is.** The present state is established
  and re-runnable; the forecast is labelled as a forecast.
- **Every gain and every loss names its evidence class, and at least one gain is `measured` or
  `demonstrated`.** A proposal with neither, whatever `derived` or `judged` claims it carries,
  is handed back and not filed.
- **No confidence rating, numeric or qualitative.** A class is a kind of evidence, and an
  adjective of certainty is not one.
- **A proposal names an observable metric chosen for it**, says why that metric and how it is
  re-evaluated afterwards. No metric is required of every proposal, and none is tallied across
  proposals.
- **The losses are named before the recommendation**, the reversal cost among them, and the run
  claims no net figure.
- **Doing nothing, and the smallest version that captures most of the gain, are always among the
  alternatives.**
- **Web research is required for every proposal, and a run that cannot reach the web files
  none.** It reports which probe failed rather than filing on the repositories and the registry
  alone.
- **A page never carries the present-state measurement**, and a claim about an upstream library
  taken from memory is `judged` at best.
- **At most three proposals are filed in a run, and the search stops at the third.** The run then
  goes deep on those three, not wide on more. The cap is never a target: a run that confirmed
  fewer says so, and no search is widened to fill it.
- **Nothing with a security impact is filed here**, in an issue, a bundle or a report detail. It
  goes back to the invoking agent for `security-audit-discovery`'s private route.
- The run **creates no label**, milestone or project, and assigns nobody.
- **Never a pull request, a branch, a commit, a patch, or a design document committed to a
  repository.** A proposal is prose in an issue.
- **One report per run**, describing that run only. Never a tracking issue, never an omnibus
  thread, never an edit to a report already handed over.
- The skill **never closes, reopens, edits or comments** on an issue, a pull request or an
  advisory, its own records included. Closing is the owner's. History is never filtered by state.
- **Never read, echo, log or copy a credential.** Capability is established by response codes
  alone.
- **Every checkout is left as it was found.** A command that can write is not run in a checkout
  that was already dirty, and a checkout the run did not find clean is never restored, stashed or
  checked out: destroying somebody's uncommitted work is changing source. The run's own writes
  are limited to: the issues of a confirmed proposal, the bundles, the report it hands back, and
  files under `/tmp/restructure-discovery/`.
<!-- guardrail:end -->

## References

- `references/forecast.md`: what each evidence class takes, how a proposal's metric is chosen and
  re-evaluated, the losses and the reversal cost, and the outside routes with the citation form
  for each.
- `references/run-report.md`: the report's contract, the rolling table and its fixed status
  vocabulary, the `Moves:`, `Decisions read:`, `Outside reading:` and `Done so far:` lines, and
  what survives when an artifact expires.
- `../issue-discovery/references/issue-api.md`: the issue calls, the permission each needs, the
  label per kind for a bundle, and the ways the issues endpoint misleads a reader. One home for
  both runs that file issues, read rather than copied.
