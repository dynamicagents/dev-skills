# The forecast

A proposal's value is in the future, and no run can establish the future. What it can establish
is **where we are now**, and what class of evidence stands behind each thing it expects the
change to buy or cost. This file is the home of both bars, and of the outside routes that earn
one of the classes.

`../SKILL.md` step 6 is where a run reads which bar applies; this file says what each one takes.

## The two halves, kept apart

**Where we are now** is established, not predicted: what is there today and what it costs us, by
a named command and its output or by full-SHA permalinks with line ranges. A reader re-runs it.
This is the half that satisfies the shared evidence gate in the workspace `AGENTS.md`, under
"Evidence first: the gate".

**The forecast** is the expectation: what the change would buy, what it would cost, and in what
order. **A forecast is not a measurement, and it says which it is.** A proposal that writes its
forecast in the voice of its measurements has taken the one thing a reader must be able to
weigh for themselves and presented it as settled.

## The evidence classes

Every gain and every loss in a forecast names exactly one, and the class is read off the
artifact behind the claim rather than chosen for how it reads.

| class | what it takes | what a reader does with it |
| ----- | ------------- | -------------------------- |
| `measured` | the metric is countable in the tree today, and the change's effect on it is arithmetic over what exists: copies that would become one, places a change has to be made, steps in a process. A named command and its output | re-runs the command |
| `demonstrated` | a named project outside this workspace made the same move, and what it bought is visible in its tree, its release notes, its changelog or its issue history. A permalink, or a URL with the date it was read | opens the citation and reads the same thing |
| `derived` | the claim follows from a constraint written down here plus a fact established at `HEAD` or upstream. No step in the chain is taken on trust, and both ends are cited | follows the two citations and the step between them |
| `judged` | it rests on a step nobody can check: how a team will feel about a shape, how much easier something will be to extend, what a future consumer will want | weighs it as the run's opinion, which is what it is |

**At least one gain is `measured` or `demonstrated`.** Those are the two a reader can re-check
without trusting the run, which is what the shared gate asks of any finding. A proposal with
no `measured` and no `demonstrated` gain is handed back rather than filed, with the measurement
or the reference that would make it checkable named, and its report row is `forecast too thin`.
That covers more than an all-`judged` forecast: `derived` alone, or `derived` mixed with
`judged`, fails the same gate, because neither leaves a reader anything to open.

`judged` is not a lesser citizen and it is not to be avoided. Much of what makes a foundation
better is genuinely a judgment, and labelling it is how a reader can tell it apart from the
parts they can check. What is forbidden is a `judged` claim dressed as a `derived` one, and a
decisive gain that is neither `measured` nor `demonstrated`.

**A class is a kind of evidence, not a degree of belief, and nothing is reported beside it.**

- No percentage and no score. A number a model produces for its own certainty is not a
  probability, and a published bar becomes something to clear rather than a test to pass.
- **No qualitative rating either.** "Likely", "probably", "fairly confident", "high confidence":
  none of these is a class, and none of them stands in for one. They are the form a rating comes
  back in once a number is refused, and they are easier to inflate, because nothing anchors
  them.
- The class already answers the question a rating is reaching for, because it names the artifact
  a reader can open.

## The metric

**No metric is required of any proposal**, and there is no standard set. What is required is
that a proposal **names one observable metric chosen for the opportunity in front of it**, says
why that one is the right measure of this particular change, and says **how it is re-evaluated**
afterwards. A forecast nobody can read back is not a forecast: it is a sentence that can never
be wrong.

Metrics this train has offered, as examples to think with and **not as a checklist**:

- surface that goes: files, copies, lines, a workflow kept in several places;
- how many places one logical change has to be made today, and how many after it;
- steps removed from a process: a release-train hop, a carry-over done by hand, a sync nothing
  checks;
- what a consumer pays: the route a new project takes, and how far it gets before it works;
- defects of a class already paid for, counted from history;
- convergence with a reference implementation, so future upstream work lands here rather than
  needing a port.

A proposal whose best measure is none of these names its own. Two rules keep the list from
hardening into a required set:

- **The metric describes the opportunity, not the opportunity the metric.** A proposal written to
  the metrics that already exist is a proposal shaped by its instruments.
- **Nothing is tallied across proposals.** Two proposals measured on different things are not
  comparable on a number, and the report carries no metric column for that reason
  (`run-report.md`). A chart drawn across proposals is how a tailored metric becomes a universal
  one.

**Re-evaluation is the other half of naming a metric**: the command, the reading or the
observation that says, after the change has landed, whether the forecast held. It goes in the
proposal, because the person who takes the decision is the person who wants to know later
whether it paid, and the report's `Done so far:` line reads it back for proposals that were
done.

## The losses, and the trade

The losses are part of the case and not a disclaimer at the end of it. Each one names its own
class, exactly as a gain does, and says who feels it.

- **A proposal with no losses named is a sales pitch.** Where the run can find none, it says what
  it looked for and failed to find, which is at least: a consumer that breaks, work that gets
  harder, something foreclosed, and the cost of reversing it.
- **The reversal cost is always named**, with what undoing the change would take and what would
  have been built on top of it by then. How hard a thing is to undo is a long-term property in
  its own right, and the one most often left out of a case for doing it.
- **The trade is one sentence**, in the form "we take X to stop paying Y".
- **No net figure.** The run makes both sides legible and leaves the decision to the owner. A
  balance presented as arithmetic over things that are not commensurable is the dishonest version
  of this section, and it reads as rigour.
- **Doing nothing, and the smallest version that captures most of the gain, are always among the
  alternatives.** Without the second, the comparison is against the whole proposal rather than
  against the margin, and the margin is where most of these decisions turn.

## Outside the repositories

Required of every proposal, and it is how `demonstrated` is earned. A run that cannot reach the
web files nothing (`../SKILL.md`, step 3), because the alternative is a proposal about what
current practice is, written from memory.

| route | what it is good for | the citation |
| ----- | ------------------- | ------------ |
| an upstream repository, read with `gh` | what a library actually does, and what a reference project did about the same problem | a full-SHA permalink with a line range, or a release or issue URL |
| the npm registry | what is published, and at what version | the command and the version it answered |
| a web page | documentation and a project's own account of a change | the URL, the date it was read, and the claim it supports, marked as a page that may have moved |

```bash
gh api repos/<owner>/<name>/releases --jq '.[0] | .tag_name, .published_at'
gh api repos/<owner>/<name>/commits/<ref> --jq .sha      # for the permalink
npm view <package> version
npm view <package> dist-tags
```

Two rules keep this honest:

- **A version is read, not recalled.** A claim about an upstream library taken from the model's
  own memory is `judged` at best, whatever it is about: an API, a version, a default, a
  deprecation. The registry and the repository are one call away, and the call is the claim.
- **A page never carries the present-state measurement.** A page is not re-checkable the way our
  own tree is, so an outside source backs a `demonstrated` claim about somebody else's
  experience, never a count of what is in these repositories.

**A proposal that would add a dependency says so in its own words and names the package.**

## Reading a draft proposal before it is filed

The ways this document goes wrong on its own terms, which are worth a pass before anything is
created:

- **A certainty adjective standing in for a class.** This is the way a rating comes back. Read
  every gain and every loss and check that each carries one of the four names and no modifier
  reaching for a degree.
- **A gain in the measurements' voice.** A forecast sentence written as though it had been
  observed, with no class beside it, is the failure the two halves exist to prevent.
- **A metric chosen because it was easy to count.** Ask whether it is the measure of this change
  or the measure that was available.
- **Losses thinner than the gains.** If the losses section is shorter than the case for the
  change, the proposal is advocating rather than proposing, and the reversal cost is usually
  the paragraph that went missing.
- **A recommendation before its alternatives.** The order is the discipline: both sides, then
  the alternatives, then what this run recommends.
