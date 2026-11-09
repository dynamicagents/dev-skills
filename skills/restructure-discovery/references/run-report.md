# The run report

One report per run, written once at the end, human- and agent-readable. It is the only thing
that carries forward between runs, and a run that cannot publish one writes the same text and
hands it back (`../SKILL.md`, step 11).

## What it is for, and what it is not

Two readers. A person deciding whether this run is doing anything, and the next run, which is
briefed from it. What the next run needs is **which decisions have been re-checked, by which
moves, and what came of each**, so that it spends its window somewhere else.

What the report is **not** is the record of a proposal. The issues are, and they are public,
permanent and readable at any time, which is the whole reason this report can be thin about what
was filed and must be thorough about what was not. **A decision this run re-checked and left
standing leaves no issue behind.** It exists here or nowhere, and it is the most useful row in
the table: it tells the next run that ground is walked and why.

**Nothing here is redacted, with one exception.** This report names repositories, paths and the
issues it filed, because every one of those is public the moment the issue exists. The exception
is a candidate handed back for the private route (`../SKILL.md`, step 7): its row says only that
one was handed back, with no repository, path or mechanism. The rule that does carry over: the
report is handed back, never posted as an issue or a comment, because a report is not a tracking
artifact (`../SKILL.md`, guardrail block).

## The shape

````markdown
# Restructure discovery: <Restructure-Run>

History: complete | incomplete | reconstructed, covering <earliest row> to <latest row> (or: <which link could not be read>).
Done so far: <n> proposals from earlier runs carry the `approved` label (label only, not the approval check), <n> are closed declined, <n> are still open; of those done, <what happened when each one's own metric was re-evaluated>. Bundles: <n> items done, <n> declined, <n> open.
Moves: <move> <attempts>/<confirmed>, … for this run; not used this run: <moves>.
Decisions read: <the stated decision, and where it is written>, … ; <any whose premise this run established still holds>.
Outside reading: <what was read beyond these repositories>; the web probe was answered by <page>.
Clock: the search closed at <time>; depth closed at <time>; <what, if anything, the clock stopped>.
Stopped at: third confirmation, then deepened (or: clock, with <n> confirmed and <what was in flight>; or: moves exhausted, then deepened, with <n> confirmed).
Read at: core <sha>, plugins <sha>, starter <sha>, g2a-protocol <sha>, create-dynamicagents <sha>, dev-agents <sha>, dev-gates <sha>, slack-gatekeeper <sha>; <any that were behind their main>.

## Attempts, last three months

| hypothesis | run (UTC) | status | what was researched, tested and ruled out | issues | move, class |
| ---------- | --------- | ------ | ----------------------------------------- | ------ | ----------- |
| core's vitest ceiling is held by an upstream crash that may be fixed | 2026-09-02T09:12:05Z | ruled out | The premise is core's `AGENTS.md` measurement of the Workers pool losing spec files on vitest 5, and it still holds: re-ran the suite on the pinned pool and on the newer one in a clone under /tmp, and the newer one still loses files to the 1009 reason. The upstream issue is still open. Re-opening this needs a release that changes that measurement, not a second reading of the same issue | | re-check a stated premise, measured |
| the gate and the train each declare the wire contract's constants, and a shared package now exists for them | 2026-09-14T15:40:11Z | filed | Confirmed: both sides spell the same values, read at both HEADs, and the shared package is published and installed on one side already. Depth established which side owns the change and what the other does after a release | dynamicagents/dev-agents#88 | extract a shared home, measured |
| the scaffold could hand a new project its toolchain from a published preset rather than copying it | 2026-09-14T15:40:11Z | forecast too thin | Established what is copied today and that a preset would hold it, which is a derived gain and the strongest here: nothing counts what the copying costs, and no reference project was found that moved the same way, so no gain reached measured or demonstrated. What would change it is a count of the drift between a scaffolded project and the template it came from | | change how a consumer starts, derived |
| plugins' container could install its toolchain from the lockfile the image already carries | 2026-09-14T15:40:11Z | inconclusive | Established where the install happens and what it reads. Whether the image's lockfile covers it was unresolved when the search ended at the third confirmation. Worth a window of its own | | adopt instead of own, |
````

**The rows are examples and not history.** What they show is the level the summary column is
written at, which is the thing most often got wrong.

The columns are those, in that order. The first four are the audit's, in the audit's order, so
somebody who reads both reports reads one table twice rather than two tables. The last two are
this run's own. A row carried from a report that had no `move, class` column keeps that cell
empty: nobody writes a move for an attempt they did not make.

**The hypothesis phrase is the first column and the key**: it is how a later run recognises an
attempt it is being told about, which is why it is written once and kept rather than rephrased
per report. Unlike the audit's it may name a repository and a path.

**One row is one attempt.** A proposal whose effects reach three repositories is one attempt and
one issue, so one row. A bundle item is an attempt of its own, so a row of its own, and every
item of one bundle carries that bundle's URL.

The `run (UTC)` column is the `Restructure-Run` timestamp, which is both this run's date and the
join to every issue it filed. It repeats across rows whenever a run made more than one attempt,
as the last three above do.

**The `move, class` cell carries the move, and the evidence class behind the decisive gain.**
Nothing else: it is there so the next run can read the rotation and see at a glance which
attempts rested on something a reader could check. On a `forecast too thin` row there is no
decisive gain, so the cell carries the **best class the attempt reached**, which is what says
how far short it fell and therefore what would close the gap. A row that established no gain at
all carries the move and leaves the class empty.

**No metric values are carried in the table.** The metric is the proposal's own and lives in its
issue (`forecast.md`). A column of numbers here would invite a comparison across proposals
measured on different things, which is how a metric chosen for one opportunity turns into a
metric every proposal has to report.

### The status vocabulary is fixed

| status | what it means |
| ------ | ------------- |
| `ruled out` | tested, and the hypothesis does not hold: usually the stated premise still holds, and the summary says which fact holds it. Often the most useful row in the table |
| `inconclusive` | read carefully and never resolved, or the clock reached it, or the search ended at its third confirmation while this was still in flight. Not a claim in either direction |
| `forecast too thin` | the present state was established and no gain came back `measured` or `demonstrated`, so there is nothing a reader could check. `derived` alone, `judged` alone and the two mixed all land here, because the gate is what one gain reaches rather than what the rest are. Filed nowhere, and the summary names the measurement or the reference that would change that |
| `prior decision` | the attempt arrived at something an earlier record had already decided, and that decision stands |
| `filed` | confirmed, and filed as a proposal or as a bundle item. The issue URL is in the `issues` column |
| `confirmed, not filed` | confirmed and deliberately not filed. The summary says which reason: the caller asked for report-back-only, a destination's history could not be read, it was handed back for the private route, or it was a wrongness too large for a bundle item and went to the caller |

Fixed, because the column is read by the next run as much as by a person, and a vocabulary that
drifts per report is one nothing can read twice.

**`forecast too thin` is this run's own**, and it is why the vocabulary needed a sixth value.
`inconclusive` would deny what was established, and `ruled out` would claim the hypothesis was
tested and failed, when what happened is that the case could not be made checkable. The next run
reads it as an invitation: the work is done, the measurement is missing, and the summary names it.

There is no `below floor`, because this run has no floor, and no `out of scope`, because nothing
is out of scope: a candidate that is not this run's is a bundle item or a hand-back, and its row
says which.

### The summary column is the useful part

Write it for the next run: which decision was read and where it is written, what was tested, and
what left the premise standing or what is still unknown, **naming the repositories, paths and
upstream facts it read**. Those, with the row's `run (UTC)`, are what the two-sided re-attempt
rule checks for change (`../SKILL.md`, step 4); a summary that names neither a path nor an
upstream fact leaves the next run to judge the row by reading. A reader should be able to decide
from it whether to spend a window on that decision again. **Too terse is the common failure.**
"Tested, no finding" tells a later run nothing and costs it the whole attempt a second time.

A `filed` row is short on purpose, and it is the one case where brevity is right: the issue
carries the forecast, the classes, the losses and the citations, and the row only has to say it
was confirmed, what depth added, and point at it.

## The `Moves:` line

What keeps a run from proposing what the last one proposed. Each move this run drew from, with
how many attempts it made from it and how many of those it confirmed, and then every move in
`../SKILL.md`, step 4, that it did not use. The next run reads it before forming a wave: the
rotation rule there takes at least one move this line lists as unused.

A count of attempts with none confirmed is worth writing as plainly as a productive one. A move
that keeps coming back empty is one this train has little of, and that is a finding about where
not to look.

## The `Decisions read:` line

The other half of rotation, and the one the moves cannot carry. It names the stated decisions
this run re-checked and where each is written, so the next run reads elsewhere rather than
re-opening the same `AGENTS.md` section under a different move. Where a premise was established
as still holding, say so on this line as well as in the row: that is the fact a later run would
otherwise buy again.

## The `Outside reading:` line

What was read beyond these repositories, and which page answered the web probe. It costs a line
and saves the next run the same searches, and it is the only record that a run which filed
nothing still did the reading it owed.

## The `Done so far:` line

The only honest measure of whether any of this is working. This run files proposals; it decides
nothing and implements nothing. If the proposals are not being taken up then either the train
does not want them or they are not being made well, and the report should say so rather than
list three more as though filing were the point.

It is read from the step-9 listing the run already makes, so it costs no extra call: of the
issues carrying a `Restructure-Run` trailer from an earlier run, how many carry the `approved`
label, how many are closed declined, how many are still open. **And for any that were done,
what happened when that proposal's own metric was re-evaluated**, which is the loop the metric
rule exists to close (`forecast.md`): a forecast nobody reads back is a sentence that can never
be wrong.

**The label is not the approval, and this line says so in those words.** What makes an issue
approved in this workspace is the `approved` label applied **by the train's owner**, with no
body edit or title rename by anybody else after it, and the workspace `AGENTS.md` under
"Issues" carries the history query that establishes both. A listing returns the label and the
state and says nothing about who applied either, so a count read off it is a count of labels.
This run does not run that query: it works no issue, and approval is not its to establish. So
the line reports the label, names it as the label, and a reader who needs the decision runs the
check. Writing "approved" off a listing would publish an approval nobody verified, and an
unverified approval in a progress count is how a label applied by any account with triage
access becomes a number the next run reports as acceptance.

Two further limits to state rather than paper over. A proposal whose issue was filed before the
oldest listing page reached is not counted, and `--limit` is what decides that
(`../../issue-discovery/references/issue-api.md`). And what an issue *says* it changed is what its
author claimed, not what the merge actually did: the line reports the claim and says that is
what it is.

## Sorting, the window, and carrying it forward

Rows are sorted **earliest to latest**, so the table reads as a history and the newest rows are
where a reader stops. The window is **three months rolling**: each run copies the rows it was
handed that are still inside the window, appends its own, and drops the rest. Nobody edits a row
they were handed, and nothing is renumbered. A handed row keeps its status even where the
vocabulary above no longer offers it; such a row records what an earlier contract decided rather
than what this one would.

**The `History:` line moves with the rows.** `complete` is a claim about the whole chain and not
about this run's read, so write it only where the window handed over was complete *and* this run
read it. Otherwise the state handed over stands, `incomplete` or `reconstructed`, with what is
missing named: a window that arrived short is not healed by the next run's link opening cleanly.
The brief's `history_state` is the caller saying which to expect; the line on the report behind
the link is the run that wrote it saying the same for itself.

## No second home for the table

The table lives in reports and nowhere else. **Not** in the Coordinator's memory, not in a
tracking issue, and not in a store added to hold it. A copy is a second home for one fact, and
the copies do not stay in step, so the reader cannot tell which is current. The Coordinator
carries high-level context in ordinary session history, which is what that is for.

## When the table cannot be recovered

A report's retention is the host's, and the window is three months, so the table survives by
being carried forward. A gap longer than retention breaks that, and what survives is asymmetric:

- **Recoverable**: every run that filed something. The issues never expire and each carries its
  run and hypothesis trailers, so those rows rebuild from the repositories.
- **Lost**: every premise this run re-checked and left standing, every thin forecast, every
  inconclusive attempt, every run that proposed nothing, every `Moves:` and `Decisions read:`
  line, and every summary. Those were only ever here, and they are the half that tells a run
  where not to look.

A rebuilt table is marked `reconstructed`, says which part of the window is missing, and **does
not claim three months of history**. An attempt the table does not show is **unknown rather than
new**: a candidate to run again, not a novelty to report. Invent nothing. A row nobody wrote is
not a row to write now.

## Checking a draft before it leaves

There is no disclosure check to run beyond the one exception above: every other record this run
writes is public by design. What is worth reading the draft for is the ways it goes wrong on its
own terms:

- **A summary that would cost the next run its window.** Read each `ruled out` row and ask whether
  it says enough to not repeat the attempt, and whether it names the fact that still holds the
  premise. If it does not, the row is the one thing in this document with negative value.
- **A `forecast too thin` row that does not say what would thicken it.** That row exists to hand
  the next run a shopping list, and without one it is just a shrug.
- **A `Stopped at:` or `Clock:` line that describes a run other than this one.** Every time in it
  is one the run observed.
- **A `Done so far:` line that flatters.** It counts what was taken up and what the metrics said
  afterwards, not what was filed. A run with three new rows and nothing taken up behind it is a
  report saying this is not landing, and it should read that way. The other way it flatters is
  quieter: a label counted as an approval, which the line never does.
- **A row for a candidate handed back for the private route that says more than that.**
