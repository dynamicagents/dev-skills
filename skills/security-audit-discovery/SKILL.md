---
name: security-audit-discovery
description: >-
  Go looking for the security weakness no single component owns: a sequencing or
  interactivity weakness that parts of the Dynamic Agents train and the gates it is
  reached through, each plausible on its own, compose into. Works from a brief carrying
  the recent attempt history, researches attack hypotheses, has bounded investigators
  test them, confirms the evidence itself, stops looking at its third confirmation, files
  every confirmed finding as a private GitHub security advisory in the repository that
  owns the code, and writes one report per run. Discovery only: it writes no fix, no
  dependency bump and no pull request. Use when asked to audit
  the product, a repo or an area for security, or to go looking for vulnerabilities. Not
  for reviewing the pending diff on a branch (that is `security-review`), not for writing
  the fix, and not for a finding that is not a security weakness.
disable-model-invocation: true
---

# Security audit discovery

The unit of work is an **attempt**: a named hypothesis about what happens when parts of
the train are composed, tested against the code until it is confirmed or dropped. Not a
pass over a file list.

What a run is looking for is the weakness **no component owns**. An ordering nobody
checked, a retry that outlives the decision that stopped it, trust established once and
reused after the thing it was established about moved, a limit enforced on one path and
not on the second one, one tenant's input reaching another tenant's object. Each part
reads as correct on its own, which is exactly why reading one part at a time does not find
these, and why a depth-first sweep of every file is the wrong shape: a single-component
bug is what review and `security-review` already cover.

Triggered by a person, or by the Coordinator on a person's behalf. Nothing schedules it.

The workspace `AGENTS.md`, under "Discovery runs", carries the evidence gate, the
disposition table, the citation rule and the rules against edits and against reading a
credential. Read it first; this file carries what is specific to a vulnerability,
including when the run stops (step 8).

**A finding and the report never mix.** A finding is private and lives as a security
advisory in the repository that owns the code. The report is reached by a bearer link, and
says what was attempted and nothing a reader could act on.

---

## What the run reads

**Both workspaces.** The train is the checkout this session starts in, `dev-agents` and its
submodules. The gates are the other side of every crossing the train is reached through,
and nothing checks them out for the run: `dev-gates` holds `slack-gatekeeper` and its own
pin of `g2a-protocol`. So before it forms a hypothesis, the run clones them:

```bash
mkdir -m 700 -p /tmp/security-audit-handoff   # the mode is step 10's
find /tmp/security-audit-handoff -maxdepth 0 -type d -user "$(id -un)" -perm 700 | grep -q . \
  || { echo "/tmp/security-audit-handoff is not this user's private directory" >&2; exit 1; }
gates=$(mktemp -d /tmp/security-audit-handoff/dev-gates.XXXXXX)
git clone --recurse-submodules --remote-submodules https://github.com/dynamicagents/dev-gates "$gates"
```

`mkdir -p` applies its mode only to a directory it creates, and accepts one that is already
there or a symlink to one, so on a shared host another user can have made this path first. The
`find` is what establishes the mode step 10 relies on: it names only a real directory, this
user's, with no access for anybody else. If it fails, stop and report the path, and write
nothing there.

The clone goes under the handoff directory because that is the one place this run writes
(the guardrail block), and it is outside every checkout. It goes in a directory of its own,
because the handoff directory outlives a run: an earlier run's clone is older code, and
`git clone` refuses a directory that is not empty. The run keeps the path `mktemp` printed
and reads the gates from there. A hop on the gate's side of a
crossing is then read like any other, never assumed or left as the step a finding could
not walk.

**Every repository is read at its default branch's tip**, because that is what ships: the
gatekeeper and starter deploy each green push to `main`, and the libraries release from it.
A recursive clone checks out each gitlink instead, which is dev-gates' known-good
combination and lags `main` by design, so `--remote-submodules` takes each submodule's
declared branch, the way the train's own submodules are kept on theirs. `HEAD`, wherever
this file names it, is then a tip. A train checkout is somebody's and is left as found:
where its `HEAD` is not what `git -C <dir> ls-remote origin HEAD` names, or
`git -C <dir> status --porcelain --ignore-submodules=all` lists anything, as on a laptop
behind `main`, mid-feature or mid-edit, the run reads that repository from a clone of the tip
under the handoff directory, made as above. Submodules are ignored there because each is
checked as a repository of its own, and a superproject's sit past their pins by design.

**Name the commit read in every repository**, both workspaces (`git -C <dir> rev-parse
HEAD`). A permalink cites it, and step 12 reports it. Which `g2a-protocol` each side runs is
the version its lockfile names, never a submodule's checkout, so the version seam (step 4)
is read off the lockfiles, as the next paragraph has it.

**Libraries are read at the version the lockfile names.** A checkout's `node_modules` may
be the workspace's install still running, one that failed, or one copied in from
elsewhere, and nothing in it says which; a library read at another version is a claim
about other code. So wherever a conclusion rests on a library's behaviour, and wherever
the run needs a driver of its own (step 6), it clones that repository at the commit it
read into a directory of its own under the handoff directory, made as above, and runs `npm
ci` there: that installs exactly what the lockfile records, transitive dependencies
included. `npm ci` writes only the ignored `node_modules` and edits no manifest or
lockfile, so it is not the dependency change the guardrail block forbids.

---

## 1. The brief

A run holds no state between runs. Everything it knows about earlier attempts arrives in
the prompt that starts it:

```yaml
history: <url>           # the most recent report's link, or absent. Open it for the table
history_state: complete  # complete, incomplete or reconstructed
prior_reports: []        # up to four older, unexpired links: the detail, and the fallback
deadline: <ISO-8601 UTC> # optional. Absent means the run computes its own in step 2
```

**The run reads the history the brief names, and goes looking for none of its own.** The
rolling table is not copied into the brief: `history` is a link, and the run opens it and
reads the table out of the report behind it. That is a read of a page and not a call to a
store, and a link the brief handed it is a page this run may open wherever it is hosted
(`AGENTS.md`, under "A run is briefed, and keeps nothing"): the run holds no artifact
binding, calls no artifact API, and publishes nothing. Where a run is hosted, how its
report is served as text, and how it reaches the next run are all the caller's business
and not this skill's (step 11).

- **A link that yields no table is unknown history, never a clean window.** A record past
  its retention, a link that arrived wrong, a session with no route to the host, a host
  answering with a page no table can be read out of: each leaves this run without the
  window it was meant to have, and **no status code tells them apart**, because a host may
  answer `200` with a page that holds nothing. What decides it is whether a table came
  back. Say which link failed and treat what it held as unknown.
- **The nearest thing to a window this run could not read is an older report.** Where
  `history` yields no table, open the newest `prior_reports` link: the rows still inside
  the window are the window as that report saw it, and what is missing is every run after
  it. That helps where the failure was the one link's rather than the host's, and the
  report says which report the window came from.
- **Absent history is not evidence of novelty.** An attempt the window does not show is
  unknown, not new. Say which it is, and never present a thin window as a clean one.
- `history_state` is the caller's claim about the window, and the `History:` line of the
  report behind the link is what the run that wrote it said. Neither is cleared by this
  run's own read going well: `references/run-report.md` carries how that state moves with
  the rows.
- `prior_reports` is the detail behind the table, opened when it would change what this
  run does and as the fallback above. One that will not open leaves that detail unread,
  and the run says so rather than implying it read it.

---

## 2. One clock, shared

Take the run's timestamp and its deadline once, at the start, in UTC. The deadline goes
verbatim into every brief this run hands out: two workers must never disagree about when
to stop. The timestamp is this run's id and stays with the orchestrating run: a worker
files nothing, so it has no use for one.

```bash
date -u +%Y-%m-%dT%H:%M:%SZ                                 # Audit-Run: this run's id, to the second
date -u -d '+<window_minutes> minutes' +%Y-%m-%dT%H:%M:%SZ  # the deadline, if the brief named none
date -u -v+<window_minutes>M +%Y-%m-%dT%H:%M:%SZ            # the same, where date is BSD's and -d is not a flag
```

```yaml
# The run's one clock. Minutes, UTC, computed once and shared verbatim. `window_minutes`
# is where the deadline above comes from, and the only place that number is written.
window_minutes: 90        # the start of research to the deadline
open_candidates_until: 25 # minutes before the deadline: no candidate is opened after it
confirm_until: 15         # minutes before the deadline: confirmation stops here
```

The clock bounds **search and confirmation, and nothing after them**. Filing a confirmed
finding, writing the report and handing the session back all complete after the deadline
has passed: a clock that could stop a confirmed finding from reaching its advisory would
throw away work already paid for, and leave a vulnerability unreported to save minutes.

A deadline is **never** a reason to weaken the evidence bar or file a candidate that is
not confirmed. Running out of time means a run with fewer findings, and
the report says where the clock bit.

A brief may name a deadline closer than `open_candidates_until`. The margins are absolute
minutes before it, not fractions of the window, so there is then no room to open a
candidate that could ever be confirmed. Open none, report the window as too short to
research in, and stop. Scaling the margins down to fit would buy candidates the clock has
already decided.

---

## 3. Check the credential before spending the window

Probe the advisory routes this run depends on **before** researching anything. The submit
probe creates nothing, because the body is missing a required field. A `422` is the green
light: the endpoint accepted the caller and rejected the body. A `403` means the credential
lacks the permission.

```bash
# Submit path, per candidate destination: every repository in scope, both workspaces,
# each superproject and each of its submodules. `repository_advisories=write`.
echo '{}' | gh api -i --method POST repos/dynamicagents/<repo>/security-advisories/reports --input -

# Read path, the same repositories. `repository_advisories=read`.
gh api -i "repos/dynamicagents/<repo>/security-advisories?per_page=1"
```

`-i` is load-bearing: without it `gh` prints the body and the status and swallows the
response headers, and `X-Accepted-Github-Permissions`, the permission GitHub says the
endpoint wanted, is the only thing that separates a missing permission from a missing
role.

**A refused submit stops the run for that repository**, and **every submit refused stops
the run**: there is then nothing this session could do with a finding, and researching one
anyway produces a vulnerability with nowhere private to put it. Report which endpoint
refused and what that header asked for, name the login `gh api user --jq .login` answers
with and which credential that is (the workspace `AGENTS.md`, under "What a discovery run
never does": the person's on a laptop, the deployment's `GITHUB_TOKEN` in its container),
and ask for it to be fixed. Do not audit on in the hope it clears,
and do not look for another way to publish what you find.

The read matters as much as the write, and a refused listing stops less than a refused
submit. Without the listing step 9 cannot run, and a finding filed with no history behind
it is how a decision somebody already made gets re-filed. So a candidate owned by a
repository whose listing is refused is researched like any other and handed back with its
prepared body, never filed blind.

A repository with no advisories answers the listing with `200` and an empty array, so
**`403` and `404` are both refusals here** and neither is an empty history: GitHub answers
`404` where saying "forbidden" would itself disclose something.

**A `200` is not proof the history is complete**, either. The listing returns the
advisories this caller may see, and the roles that see every unpublished one are security
manager and administrator, so for a plain collaborator an empty array and a filtered view
arrive identically. That is a limit to state, which step 9 does, and not a reason to stop.
`references/advisory-api.md` carries what was measured.

Capability is read from status codes only. **Never read, echo, log or copy a credential.**

---

## 4. Form the hypotheses

**Read the constraints first.** Each repository's `AGENTS.md` states what must not be
weakened: core's zero-trust constraints, `g2a-protocol`'s rules for the wire, starter's
cancellation invariant and its isolation check, and the gatekeeper's own. A constraint
stated that plainly is rarely broken head-on. It is composed around, and that is where to
look.

**Start from what moved.** In every repository read, `git log --since=<the newest run in
the table>` lists the commits no earlier attempt could have read: a new surface, a changed
guard, a dependency round. That is the ground the table is silent about by construction, so
it is the first place to look. With no table there is no such date, and the run says so.

**Re-open an attempt only on its trigger.** A row's summary says what would re-open it: a
new write on a path, a library bump, a component brought into scope. Where that has
happened, re-test it and say which trigger fired. Where it has not, the row is walked
ground, and the window goes on interactions the table does not show.

A hypothesis names **who the attacker is, what composes with what, in what order, and what
the attacker gets**.
Two things that are each correct, in a sequence nobody checked. A candidate that names one
component and one bad input is a single-component bug and belongs to review.

The seams this train has, as prose rather than paths, because a path into a submodule does
not resolve from every checkout:

- **The gatekeeper crossing**: minted tokens, claims and audience, the push callback and
  its validation token, the questions a human answers and the answers coming back.
- **The gate's own ingress**: Slack's request signing and retries, interactivity and modal
  submissions, and who in a conversation may answer a question or approve one.
- **Registration**: how an agent and its callback come to be trusted, onboarding, and what
  the gate's admin agent may change.
- **The gate's built-in agents**: core tenants inside the gate's own Worker, called with the
  same token and callback a remote agent gets.
- **Output reaching a person**: what an agent's reply, a model's text or a link becomes
  once it is rendered where people read it.
- **Versions across the wire**: which `g2a-protocol` and which core each side installs, and
  what one side accepts that the other no longer sends, or the reverse.
- **The durable task lifecycle**: accept, cancel, retry, idempotency, settle, the delivery
  outbox, retention, and the guarded writes that decide each.
- **Delegation**: a step job, a subagent, what a child may read and what it leaves behind.
- **The capability surfaces**: the egress gateway and the stream parser, the container and
  its install, token placeholders and the swap that replaces them.
- **The deployment**: bindings, migrations, the secret surface, per-tenant isolation inside
  one bundle.
- **The scaffold**: what a new project inherits before any of this is installed.
- **Publishing**: OIDC release, a git ref installed by `prepare`, which scripts a consumer
  allows to run.

Interaction classes worth asking about, because this is the shape such weaknesses have
had: a decision read before the write that decides it; a retry that survives a terminal
state; a cancel racing a settle; a resume carrying state from before an authorization
changed; a callback target an attacker can influence; a surface reachable only after a
tool call; trust pinned once and reused after its subject moved.

**Who the attacker is** is a dimension of its own, because a seam read from a new position
is new ground even where the table already shows the seam. The positions this train has: a
person in a conversation the gate serves; a person answering a question somebody else was
asked; a remote agent holding a valid token; whoever controls a callback target, or a page
a model-facing capability opens; a model steered by text it read, from a web page, an
issue or pull request, or a tool's output; an outside contributor to a public repository;
a published dependency. Each report names the positions its run took
(`references/run-report.md`), and **a run opens at least one candidate from a position the
newest report's `Positions:` line does not show.** A position this list does not name
counts. Where that report took every position and the run can name no other, rotation is
spent for this run: its `Positions:` line says so, and its candidates are new by their
sequence alone, which is the novelty test below.

### The hypothesis phrase

Each attempt gets a short readable phrase naming the interaction, and it is the name that
attempt keeps: the first column of the report table, and the stable key a later run
recognises it by.

**Mechanism vocabulary only.** The phrase says what composes with what and in what order.
It never names a repository, a module, a file or a line. The report is reached by a bearer
link, so a phrase saying where the weakness is localises it for anybody holding that link.
`references/run-report.md` carries the rule, and the case where a phrase cannot be written
without a location.

**Novelty is a judgment, not a key.** Hold the phrase against the table the history link
carried and ask whether that attempt has been made: the same interaction under different
words is a repeat, a different sequence or different parties is new. No taxonomy, no hash,
no mechanical key, and no pretending that history nobody handed you proves anything.

---

## 5. Investigate with bounded subagents

Fan out over candidates, never over the product. One investigator takes one candidate, and
its brief stands on its own: a skill with `disable-model-invocation: true` is not preloaded
into a subagent (`AGENTS.md`, under "The prompt names the skill"), so nothing in the brief
may assume the subagent can read this file.

A worker brief carries the hypothesis phrase, what to read and which sequence to establish,
the run's deadline verbatim, the evidence bar from step 6, and the rules it works under:
change nothing, file nothing, publish nothing, and never read, echo, log or copy a
credential. Filing is the orchestrating run's alone.

**Concurrency stays modest.** No more than three investigations in flight, because every
claim that comes back has to be verified by the run itself, and that verification is the
narrow part. More workers buys queued claims, not findings.

**Depth, not more workers.** A candidate still unresolved after it has been read carefully
is Supported and drops out of filing. A second investigator on it buys a second opinion,
which is not evidence.

Stop opening candidates at `open_candidates_until`, or at the third confirmation, whichever
comes first. Step 8 is where the second of those is binding.

**Until then, the window is spent, not saved.** Whenever fewer than three investigations
are in flight, the run opens its next candidate. A run that has resolved everything it
opened is not finished while the clock allows another attempt the table does not show, so
stopping before `open_candidates_until` is the run's to justify, on the report's `Clock:`
line.

---

## 6. The run verifies, the worker does not

A subagent's report is a **claim**, and a claim is not evidence. Before a candidate can be
filed, the orchestrating run re-reads the code at `HEAD` itself and re-runs whatever the
claim rests on, naming the commit it read.

What makes a vulnerability **Confirmed** here depends on the severity it is filed at (step
7), because each row of the rubric claims something different, and a claim is confirmed
at the severity it makes:

- **`critical` and `high`** claim a reachable sequence, and the run has walked it:
  - the **entry point** it starts from: a route, an A2A call, a gatekeeper claim, a Slack
    request, a tool the model can call, a file the container writes, an environment a
    `postinstall` reads;
  - **each hop**, as a full-SHA permalink with a line range;
  - **the composition**: why those hops hold in that order, and what the ordering costs;
  - **what the attacker gets** at the end of it, and who is exposed;
  - where the sequence can be driven, the command and its output.
- **`medium`** claims one of the two things its rubric row names. Reach that stops inside
  one tenant is the full walk above, with what the attacker gets shown to stop at that
  tenant's own data or objects. A precondition the attacker does not control is the walk
  above up to that precondition, and the precondition shown to exist: the setting, the
  configuration or the operator action that opens it, cited.
- **`low`** claims a defence is missing where another one still holds, and claims no path.
  It is confirmed by the defence shown absent at each place it would sit, what that defence
  would do (documented, or measured), and the defence that still holds, each as a permalink
  or a command and its output.

A walk that stopped short of a path is not a failed `high`. Where its evidence meets a lower
row, file it at that row and say in the advisory what was not walked; that is the rubric
read off the evidence, not impact promoting a class.

**Runtime behaviour is measured, not argued.** Whether a check holds at runtime, what a
parser accepts, what a library does with a value it is handed: a driver or a spec in a
clone under the handoff directory, run with that repository's own toolchain, and its
command and output are the evidence. A behaviour the run could have measured and argued
instead is Supported.

"This looks unvalidated", a sequence that holds only under an assumption nobody can check,
and a hop the run could not reproduce are all **Supported**: reported to the invoking
agent, filed nowhere, however large the stated impact. Impact never promotes a class.

**A vulnerability involves a party.** A gap that lets no party cross anything, and removes
no defence against one doing so, is a correctness concern at any severity: it goes to the
invoking agent with its evidence, and this run files it nowhere.

Stop confirming at `confirm_until`. A candidate still unconfirmed when the clock reaches it
is Supported, and the report says the clock decided it.

---

## 7. Severity

One fixed rubric, in GitHub's own vocabulary, so the value written on an advisory is read
off a table rather than argued per finding:

| severity | what it takes |
| -------- | ------------- |
| `critical` | an unauthenticated attacker crosses the boundary the train is built on: gatekeeper trust forged or replayed and accepted, a signing key or tenant secret exposed, attacker code reaching a deployed Worker or a container holding the repository's credentials |
| `high` | a reachable party crosses a boundary it is not inside: one tenant's data or egress reached from another, a durable task's integrity broken, a credential or its placeholder leaving the path it was swapped onto |
| `medium` | reach stops inside one tenant, or the sequence needs a precondition the attacker does not control: a limit enforced on one path and not the second, a surface that opens only after an operator acts |
| `low` | hardening with no path behind it: a defence in depth missing where another one still holds |

**Severity is what the advisory says, and nothing more.** There is no floor: a confirmed
`low` is filed like a confirmed `critical`, and severity orders nothing (step 8).

---

## 8. The third confirmation stops the search, not the filing

**At its third confirmed finding the run opens no further candidate.** Three bounds the
effort, never the filing. Investigations already in flight run on under the clock in step
2, the run verifies what they claim as in step 6, and every one it confirms is filed too: a
fan-out that confirms a fourth or a fifth in that round files a fourth or a fifth. No
confirmed finding is dropped to hold the count at three.

**Nothing is ranked.** Every confirmed finding is filed on the same footing, whatever its
severity.

Three is never a target: no search widened to reach it, and nothing filed that step 6 did
not confirm. A run that confirmed fewer files fewer and says so without apology.

---

## 9. Before filing: what has already been decided

Per owning repository, read the advisories already there with the `state` filter left off,
which is every state this caller can see. Then apply the disposition table in `AGENTS.md`,
under "What earlier runs and earlier people already decided": its rows are keyed on the
decision a record carries and it names the advisory state that spells each, so there is
nothing to translate here. Read the code at `HEAD` again as well, because a prior reason is
evidence about the past rather than about today.

Limits to state rather than paper over. Unless this identity is a security manager or an
administrator, the listing returns the advisories it is on, so one a maintainer drafted or
closed without it is invisible: a short listing is not proof nothing was decided, and an
empty one is not proof nothing was filed. And the table behind the history link says what
was **attempted** while the advisories say what was **filed**: neither is the other's
index, so say which of the two answered a question.

The exact calls, with the permission each needs, are in `references/advisory-api.md`.

---

## 10. File each finding as a private advisory

Read the owning repository's `SECURITY.md` first and follow it; it is authoritative for its
own route. Today each one points at GitHub's private vulnerability reporting.

Which repository owns it is `AGENTS.md`'s, under "The records", and the answer this run
needs most often is the one for a sequence no single repository owns: that finding is about
the train, and it goes to `dev-agents`. One finding is still one advisory, wherever the
hops were read.

Advisory body:

```markdown
## Impact
What an attacker gets, and who is exposed.

## Where
The code the finding is about, as `repo/path/to/file.ts:line`.

## Evidence
The entry point, each hop as a permalink, the sequence that composes them, and what was
read or run. Enough for a maintainer to re-run the check.

## Suggested direction
Where a fix would go. Not a patch: this run does not write one.

Audit-Run: <the run's UTC timestamp from step 2>
Audit-Hypothesis: <the phrase this attempt is named by>
```

`severity` takes one value from the rubric in step 7, and it is `severity` **or**
`cvss_vector_string`, never both: the API rejects a body carrying both.

**`Audit-Run` is the join, and the only one.** The same timestamp appears on every advisory
this run files and on this run's rows in the report table, and nothing else ties the two
together: the report carries no GHSA id, no repository and no path, and the advisory carries
no link to a bearer-link artifact. `Audit-Hypothesis` repeats the phrase, which is what lets
a later run rebuild the rows that filed once the report that carried the table has expired
(`references/run-report.md`, "When the table cannot be recovered").

**No key, and no hash.** A truncated hash of a repository, a path and a finding class is a
short value over a small space: anybody holding the report can enumerate that space and
recover what the value points at, so it is not a safe pointer in an artifact a bearer link
opens. A second hash invented for the advisory store alone would be a key nothing checks,
which is the other way a dedup key goes wrong. Dedup here is step 9, and it is read rather
than computed.

Then read the advisory back by its `ghsa_id` and confirm it is there. A refusal at any of
these steps stops the run as in step 3: the prepared request body goes to
`/tmp/security-audit-handoff/`, the operator gets the exact status and the UI route, and
nothing is published anywhere. **Outside the repository** is the requirement and `/tmp` is
how it is met: a path inside the checkout is one `git add -A` away from being the public
disclosure this step exists to avoid, and the handoff only has to outlive the session the
operator is reading.

The run made it `mkdir -m 700` before its first clone ("What the run reads"). Outside the
repository is what the path buys and it is not confidentiality: `/tmp` is world-writable
and shared by every user of the host, while a prepared body carries the whole sequence and
how to drive it. The mode
is the half that keeps it off the host, and the path is the half that keeps it out of the
repository.

If the invoking agent asked for report-back-only, file nothing and hand the finding back
instead. That is the only case in which a confirmed finding is not filed.

---

## 11. Write one report

One report per run, human- and agent-readable, written once at the end. Its contract, the
rolling table, what it may never carry and how history ages out are in
`references/run-report.md`.

The run **produces** the report and writes it to `/tmp/security-audit-handoff/report.md`,
then hands the text back in the session report. Publishing it where a next run can be
briefed from it belongs to whoever hosts the run, and a local session says plainly that it
published nothing.

---

## 12. Report back

To the invoking agent, in the session: every hypothesis attempted and what happened to each;
each filed finding with its advisory URL; each Supported candidate and what stopped it;
the attacker positions it took; the commit it read in each repository, both workspaces;
whether the run stopped at its third confirmation; where the clock bit; what the
brief did not carry, which of its links would not open, and what that leaves unknown;
anything the advisory listing could not see; and the report text with its path.

---

<!-- guardrail:start -->
- **Report only.** No fixes, no refactors, no dependency, lockfile or version changes,
  no submodule pointer bumps. Each needs separate explicit authorization from the
  invoking agent.
- Findings go to a **private advisory in the owning repository** by default.
  Report-back-only happens when, and only when, the invoking agent asks for it.
- **Never a public issue**, pull request, commit message, discussion or gist containing
  vulnerability detail. If the advisory route is refused, the run stops, hands the
  prepared body to the operator outside the repository, and asks. It never degrades to
  anything public.
- **Only a Confirmed finding is filed, and impact never promotes a class.** A candidate
  the run has not walked itself, or that rests on a worker's claim, is reported to the
  invoking agent and filed nowhere.
- **The run opens no candidate after its third confirmation, and files every finding it
  confirms.** Three bounds the effort, never the filing: no confirmed finding is dropped
  for a count, a severity or a rank, and no search is widened to reach three.
- **One report per run**, describing that run only. Never a tracking artifact, never an
  omnibus thread, never an edit to a report already handed over.
- The skill **never closes, reopens, edits or comments** on an issue or an advisory.
  Closing is the owner's. History is never filtered by state.
- The report carries what was attempted and nothing else: **no exploit evidence, no
  affected repository, component or path, no GHSA ids, no advisory links, no severities,
  no CWEs, and no detail a reader could act on**.
- **Never a report link either**, this run's history or an older one: a bearer URL copied
  into a document another bearer URL opens hands its holder the reports behind it.
- **Never read, echo, log or copy a credential.** Capability is established by response
  codes alone.
- The run's own writes are limited to: an advisory report per confirmed finding, the
  report it hands back, and files under `/tmp/security-audit-handoff/`.
<!-- guardrail:end -->

## References

- `references/advisory-api.md`: the advisory calls, the permission and role each needs,
  which credential answered, and what an advisory cannot carry.
- `references/run-report.md`: the report's contract, the rolling table and its fixed status
  vocabulary, what a report may never contain and how to check that mechanically, and what
  survives when an artifact expires.
