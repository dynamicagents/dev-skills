#!/usr/bin/env node
/**
 * Specs for what the discovery skills say, run by `npm test` and so by `npm run check` and CI.
 *
 * Pinning prose is deliberate: these skills carry rules with no structural form, and a
 * rewording should cost a deliberate edit here rather than pass silently. What a run shares
 * with every other run lives in the dev-agents workspace's `AGENTS.md`, under "Discovery
 * runs", and is pinned there, by the spec dev-agents keeps beside it, against the installed
 * copies of these skills.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { frontmatter, skillNames } from "./frontmatter.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "skills");

/**
 * The skills written here, by the names a caller puts in a prompt. Selection is
 * prompt-only (dev-agents' `AGENTS.md`, under "The prompt names the skill"), so a rename leaves
 * every prompt naming the old one running as an ordinary session: the CLI tells that
 * session its `/<name>` line did not run, and whether the caller hears it is the
 * report's business. This list is what makes such a rename deliberate.
 */
const DISCOVERY = ["security-audit-discovery", "issue-discovery", "restructure-discovery"];
const AUDIT = join(SOURCE, "security-audit-discovery");
const ISSUES = join(SOURCE, "issue-discovery");
const RESTRUCTURE = join(SOURCE, "restructure-discovery");

/**
 * One skill's own markdown: its `SKILL.md` and everything it points at. Several specs
 * below read a whole set, because a rule the skill states and a reference file restates is
 * a rule either file can break.
 *
 * A set is scoped by **destination** and never over all of them. The specs that matter most
 * assert that a run writes to its own store, so a set pooling the audit's files with an
 * issue-filing run's would pass a rule the audit broke as long as the other run kept it.
 */
const markdownUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name));

const auditFiles = () => markdownUnder(AUDIT);

/**
 * The runs that file public issues, pooled, for the specs whose rule is one sentence for both:
 * read every state, read past one page, and write nowhere on that endpoint but a create.
 *
 * Pooling is safe exactly because the destination is shared, which is the same test the
 * paragraph above applies: a file breaking a rule about the issues store breaks it whichever
 * skill holds the file, and `relative(root, file)` still names which one did.
 *
 * The report contracts stay per skill, because their joins differ: `Discovery-Run` against
 * `Restructure-Run`, and a pooled check would pass a template that had lost its own trailer.
 */
const ISSUE_FILING = [ISSUES, RESTRUCTURE];
const issueFilingFiles = () => ISSUE_FILING.flatMap(markdownUnder);

const skills = skillNames(SOURCE);

/**
 * A discovery run is selected by a caller, never picked up off its description: a run
 * files private advisories, and a model reading "security" in a prompt must not be able to
 * start one. `disable-model-invocation` is the field that makes that structural, and it
 * costs nothing at the naming end: the CLI still loads a skill that sets it, and a
 * `/<name>` line still selects it. It also keeps the description out of context until the
 * skill is named, which is why a long one costs nothing here.
 *
 * The other half of a caller choosing right is a description that says which skill this
 * one is *not*, and **nothing here asserts that half**. The skills a discovery run is
 * confused with are Claude Code's own: `security-review`, `code-review` and `simplify`,
 * all diff- or pull-request-scoped, and two of them apply fixes. Nothing in this
 * workspace can see whether one of those exists, let alone that it still answers to that
 * name, so a spec over the description could only check that it names a skill installed
 * *here*, which is a different claim and not one the description has any reason to
 * satisfy. "Discovery only" is the part that is ours, and it is the part pinned.
 */
test("each discovery skill is selected rather than inferred, and discovers only", () => {
  const installed = new Set(skills);
  for (const name of DISCOVERY) {
    assert.ok(installed.has(name), `${name} is not a skill here`);
    const fm = frontmatter(readFileSync(join(SOURCE, name, "SKILL.md"), "utf8"));
    assert.equal(
      fm?.["disable-model-invocation"],
      "true",
      `${name}: a discovery run must not be model-invocable`
    );
    assert.match(
      fm.description,
      /Discovery only/,
      `${name}: the description does not say the run is discovery only`
    );
  }
});

/**
 * Pinning prose, deliberately: the rules that have no structural form. These are what
 * keep a vulnerability out of a public place, keep a run from filing a candidate nobody
 * can re-check, and keep run bookkeeping from growing into the omnibus issue it is not
 * allowed to be. Rewording one should cost a deliberate edit here, not pass silently.
 */
/**
 * Per skill, because a guardrail block is where a run's destination is written down and
 * the two runs have opposite ones: the audit's rules keep a vulnerability out of anywhere
 * public, and the issue run's keep a run that files public issues from editing them,
 * from filing a breaking refactor or a security finding, and from claiming it proved
 * something it never ran.
 * Pooling the phrases would let either skill satisfy the other's rules.
 *
 * Every name in `DISCOVERY` needs an entry, asserted below: a skill added without one
 * would be a discovery run whose guardrail block nothing reads.
 */
const GUARDRAILS = {};

GUARDRAILS["security-audit-discovery"] = [
  "Report only",
  "private advisory in the owning repository",
  "Never a public issue",
  "impact never promotes a class",
  // Three bounds the search and not the filing: a vulnerability confirmed and then dropped
  // for a count, a severity or a rank is one nobody fixes.
  "The run opens no candidate after its third confirmation, and files every finding it confirms",
  "no confirmed finding is dropped for a count, a severity or a rank",
  "One report per run",
  "never closes, reopens, edits or comments",
  // The whole content rule, not its first item: this is the sentence that keeps a
  // vulnerability out of the one thing a run writes that a link reaches, and the items
  // with no shape (a sequence a summary walks, a component named in other words) are
  // the ones no grep over a draft can catch.
  "no exploit evidence, no affected repository, component or path, no GHSA ids, no advisory links, no severities, no CWEs, and no detail a reader could act on",
  "Never read, echo, log or copy a credential",
  // The sentence that bounds everything a run creates, pinned whole for its last item:
  // a handoff path inside a checkout is one `git add -A` away from being the public
  // disclosure the advisory route exists to avoid, so `/tmp` is the requirement rather
  // than a convenience. Nothing else here fails on a path moved into the repository.
  "The run's own writes are limited to: an advisory report per confirmed finding, the report it hands back, and files under `/tmp/security-audit-handoff/`",
];

GUARDRAILS["issue-discovery"] = [
  // The first failure to prevent: a run that finds a fix and applies it has stopped being
  // a discovery run.
  "Report only",
  "public issues in the repository that holds the root cause",
  // The finding unit, and where it lands. Without the second half a root cause in core
  // with effects in its consumers becomes an issue per consumer, which is the volume this
  // rule exists to stop.
  "One finding is one root cause",
  "filed once where the root cause is",
  // The one grouped record allowed, with what keeps it from being an omnibus: items that
  // stand alone, outside the cap, and never the reason a run goes looking.
  "Small items go into one bundle per repository per run",
  "A bundle sits outside the cap, never stops the search, and is never searched for",
  // Bugs are in scope and issues are public, so this is the sentence between a run and a
  // disclosure. Nothing else here fails if it goes.
  "Nothing with a security impact is filed here",
  "creates no label",
  "Never a pull request, a branch, a commit or a patch",
  "impact never promotes a class",
  // The honest limit. A run writes no patch, so every behaviour claim it makes is about a
  // change nobody has made: dropping this sentence turns a bounded claim into a promise.
  "never establishes that a change is behaviour-neutral",
  // The surface is every line by decision, and the row-per-kind bar is what replaces the
  // category exclusion that was considered and rejected: there is no CI in this
  // repository, so a finding that thins the suite without naming the spec that still
  // catches the mistake is the one way this run can do real damage.
  "Every line is candidate surface",
  "A constraint the code already states is a prior disposition",
  // The cap ends the search and not the run: depth on the three is what makes each issue
  // name every site, and "not wide on more" is what keeps depth from becoming more search.
  "At most three standalone findings are filed in a run, and the search stops at the third",
  "goes deep on those three, not wide on more",
  "`min_tier` starts at `local`, and only an explicit instruction from the invoking agent raises it, and only to `recurring`",
  "`cosmetic` is never filed at any floor",
  // The boundary with the sibling run, in this run's half of it. Without the first phrase the
  // riskiest changes arrive as issues that read like refactors; without the second they arrive
  // nowhere at all, which is how a boundary between two runs loses a finding instead of
  // routing it. The test both halves answer to is `restructure-discovery`'s and is pinned
  // there: the kind of search, never what the fix costs.
  "A breaking refactor is out of scope",
  "handed to `restructure-discovery` with what was established",
  "One report per run",
  "never closes, reopens, edits or comments",
  "Never read, echo, log or copy a credential",
  // This run reads every checkout in the train and may run commands in them, and some of
  // those commands write: starter's `check` regenerates its runtime types. Both halves are
  // pinned, because the obvious rule is the dangerous one: a run that restores a checkout
  // it found dirty destroys the uncommitted work that was already there, which is changing
  // source by the only route a discovery run has left.
  "Every checkout is left as it was found",
  "never restored, stashed or checked out",
  "The run's own writes are limited to: the issues of a confirmed finding, the bundles, the report it hands back, and files under `/tmp/issue-discovery/`",
];

GUARDRAILS["restructure-discovery"] = [
  "Report only",
  // This run's own first failure, and it is a different one from the issue run's: what it
  // proposes is work somebody has to authorize, so a run that started the restructuring has
  // taken a decision that was never its to take.
  "A run never carries out a restructuring it proposes",
  "public issues in the repository that owns the decision",
  // The label and its fallback, pinned together with the reporting half: a run that silently
  // filed without a label, or with one it created, would leave the owner's own index broken
  // and nothing would say so.
  "labelled `restructure` where that label exists and `enhancement` where it does not, with the report naming every destination that fell back",
  "One proposal is one decision",
  // The scope, in the one sentence that holds it. A run looking for a better foundation is one
  // prompt away from proposing a feature, and one argument away from proposing that something
  // somebody depends on be taken out.
  "A proposal adds no feature and removes nothing a consumer or an end user relies on",
  // The boundary, and then the list of things it is not. The list is the load-bearing half:
  // every variable on it was tried as the test and every one of them misrouted a finding, a
  // release-train bug into this run and a one-line dependency swap out of it.
  "The boundary is the kind of search and the kind of improvement",
  "never the effort, the release train, the size of a migration, how many repositories are touched, whether a published surface moves, or the pattern the diff matches",
  // What a boundary must never do, whichever side it sends a candidate to.
  "No candidate is dropped for not fitting the boundary",
  "Small items go into one bundle per repository per run",
  // The honesty of the whole record. A proposal's value is in the future, so the one thing it
  // must not do is present its expectation in the voice of its measurements.
  "A forecast is not a measurement, and it says which it is",
  "Every gain and every loss names its evidence class, and at least one gain is `measured` or `demonstrated`",
  // Both halves, because the second is the one a later edit reintroduces without noticing: a
  // number is obviously a score, and "likely" is the same score in words.
  "No confidence rating, numeric or qualitative",
  "A proposal names an observable metric chosen for it",
  "No metric is required of every proposal, and none is tallied across proposals",
  // The order is the discipline. Losses written after a recommendation are a disclaimer, and
  // a net figure over things that are not commensurable reads as rigour while hiding the
  // judgment it is made of.
  "The losses are named before the recommendation",
  "the run claims no net figure",
  "Doing nothing, and the smallest version that captures most of the gain, are always among the alternatives",
  // The stop condition the owner asked for in words: a run with no web access has no way to
  // say what current practice is, and the tempting failure is to file anyway on what the
  // repositories and the registry alone can show.
  "Web research is required for every proposal, and a run that cannot reach the web files none",
  "A page never carries the present-state measurement",
  "At most three proposals are filed in a run, and the search stops at the third",
  "The cap is never a target",
  "Nothing with a security impact is filed here",
  "creates no label",
  // A proposal is prose in an issue. The two ways this run could overstep are a branch that
  // starts the work and a design document committed as though the decision were taken.
  "Never a pull request, a branch, a commit, a patch, or a design document committed to a repository",
  "One report per run",
  "never closes, reopens, edits or comments",
  "Never read, echo, log or copy a credential",
  "Every checkout is left as it was found",
  "The run's own writes are limited to: the issues of a confirmed proposal, the bundles, the report it hands back, and files under `/tmp/restructure-discovery/`",
];

/**
 * The calls in `text` that name `command`, one line each.
 *
 * A `\`-continued command is **one** call and is joined back into the line that opened
 * it: a flag on the second line of one reads as absent otherwise, which is how a rule
 * about flags passes on a command that breaks it.
 */
const callsNaming = (text, command) =>
  text
    .replace(/\\\r?\n\s*/g, " ")
    .split(/\r?\n/)
    .filter((line) => line.includes(command));

/**
 * Prose with its wrapping taken out, which is how a pinned phrase is matched: these
 * files are wrapped by hand, so a phrase that happens to straddle a line break would
 * otherwise read as absent and a reflow nobody meant as a change would fail a spec
 * about disclosure.
 */
const unwrapped = (text) => text.replace(/\s+/g, " ");

test("every discovery skill's guardrail block is intact", () => {
  for (const name of DISCOVERY) {
    const phrases = GUARDRAILS[name];
    assert.ok(phrases, `${name}: no guardrail phrases are pinned for it`);
    const text = readFileSync(join(SOURCE, name, "SKILL.md"), "utf8");
    const block = /<!-- guardrail:start -->([\s\S]*?)<!-- guardrail:end -->/.exec(text);
    assert.ok(block, `${name}/SKILL.md has no guardrail block`);
    const rules = unwrapped(block[1]);
    for (const phrase of phrases) {
      assert.ok(rules.includes(phrase), `${name}: guardrail block no longer says: ${phrase}`);
    }
  }
});


/** The fenced block of `text` in `language` whose body contains `key`. */
const fencedWith = (text, language, key) =>
  [...text.matchAll(new RegExp("```" + language + "\\r?\\n([\\s\\S]*?)```", "g"))]
    .map(([, body]) => body)
    .find((body) => body.includes(key));

/**
 * The run's clock, as one block. What a worker brief carries is the deadline the block
 * derives, not the block: a worker files nothing and confirms nothing, so the margins are
 * the orchestrating run's alone. The three values
 * are a decision somebody made about how long a search may run, and two of them are
 * **margins before the deadline** rather than durations from the start: written that way
 * round, a swap reads perfectly well in prose and inverts the run, because confirmation
 * would then close before candidates stop being opened and every late candidate would be
 * unconfirmable by construction.
 *
 * So the block is the home of the numbers and this is the invariant over them. What it
 * cannot check is the one thing the skill says in prose beside it: that filing, the report
 * and the handoff all happen *after* the deadline, since a clock that could stop a
 * confirmed finding from reaching its advisory would lose work already paid for.
 *
 * Every discovery run carries its own block, because how long a search may run is a
 * decision about that kind of finding. The invariant over the numbers is not: a swap reads
 * the same in any of them.
 */
test("each discovery run's clock is one block, and its margins sit inside its window", () => {
 for (const name of DISCOVERY) {
  const skill = readFileSync(join(SOURCE, name, "SKILL.md"), "utf8");
  const block = fencedWith(skill, "yaml", "window_minutes:");
  assert.ok(block, `${name}: SKILL.md has no fenced clock block carrying window_minutes`);

  const minutes = (key) => {
    const found = new RegExp(`^${key}:[ \\t]*(\\d+)`, "m").exec(block);
    assert.ok(found, `${name}: the clock block is missing ${key}`);
    return Number(found[1]);
  };

  const window = minutes("window_minutes");
  const open = minutes("open_candidates_until");
  const confirm = minutes("confirm_until");

  assert.ok(
    open < window,
    `${name}: candidates open past the window itself (${open} of ${window})`
  );
  assert.ok(
    confirm < open,
    `${name}: confirmation stops ${confirm} minutes out and candidates open until ${open}: ` +
      "a candidate opened last could never be confirmed"
  );
  assert.ok(confirm > 0, `${name}: confirmation stops ${confirm} minutes before the deadline`);

  // And the window has one home, which is that block. The `date` command above it
  // substitutes `window_minutes` rather than restating the number, because a second copy
  // drifts in silence: a run would then compute one deadline and brief its workers with
  // the window of another, and every spec here would still pass.
  assert.ok(
    !/\+\d+ minutes/.test(skill),
    `${name}: SKILL.md hard-codes a window in its deadline command instead of substituting window_minutes`
  );
 }
});

/**
 * GitHub's severity enum, which is the whole set a `severity` field may carry. The rubric
 * is fixed so that the value on an advisory is read off a table rather than argued per
 * finding, and a rubric naming a level the API does not have is a filing call that fails
 * at the end of a run rather than at the start.
 *
 * Both directions: a level with no row is a finding with nowhere to land, and a row with
 * no level is a rubric that cannot be filed under.
 */
const SEVERITIES = ["critical", "high", "medium", "low"];

test("the severity rubric names GitHub's enum and nothing else", () => {
  const skill = readFileSync(join(AUDIT, "SKILL.md"), "utf8");

  // The rubric's own rows, taken from its header down to the end of its table rather than
  // from the whole file: any other table of backticked lowercase first cells would
  // otherwise read as severity levels and fail a spec about GitHub's enum with a sentence
  // about a table nobody meant.
  const lines = skill.split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith("| severity |"));
  assert.ok(header !== -1, "SKILL.md has no severity rubric table");
  const end = lines.findIndex((line, at) => at > header && !line.startsWith("|"));
  const table = lines.slice(header, end === -1 ? undefined : end).join("\n");

  const rows = [...table.matchAll(/^\|[ \t]*`([a-z]+)`[ \t]*\|/gm)].map(([, level]) => level);
  assert.deepEqual(
    [...rows].sort(),
    [...SEVERITIES].sort(),
    `the rubric's levels are ${rows.join(", ") || "none"}`
  );
});

/**
 * The contract between a run that writes a report and the run that is briefed from it.
 * The table is the only thing that carries forward, so its columns are an interface: a
 * renamed or reordered column is a table the next run reads wrongly or not at all, and
 * nothing else in the workspace would say so.
 *
 * `Audit-Run` is checked in both files on purpose. It is the single join between a private
 * advisory and a public-enough report row, and it only works while the advisory body
 * writes it and the table carries it: either half dropped leaves a report nobody can tie
 * to the findings it stands for, with no error anywhere.
 */
const REPORT_COLUMNS = ["hypothesis", "run (UTC)", "status", "what was researched"];
const REPORT_STATUSES = ["ruled out", "inconclusive", "prior decision", "filed"];

test("the report contract the next run reads is still written down", () => {
  const report = readFileSync(join(AUDIT, "references", "run-report.md"), "utf8");
  const skill = readFileSync(join(AUDIT, "SKILL.md"), "utf8");

  const header = report
    .split(/\r?\n/)
    .find((line) => line.startsWith("| hypothesis"));
  assert.ok(header, "run-report.md has no table header starting with the hypothesis column");
  const columns = header.split("|").map((cell) => cell.trim());
  for (const [index, column] of REPORT_COLUMNS.entries()) {
    assert.ok(
      columns[index + 1]?.startsWith(column),
      `report column ${index + 1} is ${JSON.stringify(columns[index + 1])}, not ${column}`
    );
  }

  // The status column is read by the next run as much as by a person, so the vocabulary
  // is fixed rather than written fresh each time. Each value is checked as a table cell
  // in the vocabulary section, not merely as prose somewhere in the file.
  for (const status of REPORT_STATUSES) {
    assert.ok(
      new RegExp(`^\\|[ \\t]*\`${status}\`[ \\t]*\\|`, "m").test(report),
      `run-report.md's status vocabulary no longer offers \`${status}\``
    );
  }

  // The advisory body as the skill writes it, not the prose around it: a mention of the
  // join in a paragraph is not a line on a filed advisory, and the paragraph is what
  // survives when the template loses the field.
  const body = fencedWith(skill, "markdown", "## Impact");
  assert.ok(body, "SKILL.md has no fenced advisory body");
  assert.ok(/^Audit-Run:/m.test(body), "the advisory body no longer carries the join");
  assert.ok(
    /^Audit-Hypothesis:/m.test(body),
    "the advisory body no longer carries the attempt it came from, so a lost table cannot be rebuilt"
  );

  // And the other end of the join, which is a column of the table rather than a field.
  // `assert.ok` over a regex rather than `assert.match` here and below: the subject is a
  // whole file, and `assert.match` prints it as the actual value, burying the sentence
  // that says what broke under the document that broke.
  assert.ok(
    /The `run \(UTC\)` column is the `Audit-Run` timestamp/.test(unwrapped(report)),
    "run-report.md no longer says which column the advisories join on"
  );
});

/**
 * The gates are half of every crossing the train is reached through, and nothing checks them
 * out for a run: a session starts in this workspace's checkout and sees its submodules alone.
 * So the clone is the scope, and prose saying "both workspaces" without it is a run that reads
 * one and reports the other's hops as the step it could not walk.
 *
 * Checked on the fenced command rather than the prose, and over HTTPS: a container session
 * reaches GitHub through a gateway that carries no SSH (`AGENTS.md`, "Remotes are HTTPS").
 */
test("the audit clones the gates it is reached through", () => {
  const skill = readFileSync(join(AUDIT, "SKILL.md"), "utf8");
  const clone = fencedWith(skill, "bash", "dynamicagents/dev-gates");
  assert.ok(clone, "SKILL.md no longer clones dev-gates, so a run reads the train alone");
  assert.ok(
    /git clone --recurse-submodules https:\/\/github\.com\/dynamicagents\/dev-gates /.test(clone),
    `the dev-gates clone is not an HTTPS clone with its submodules:\n${clone}`
  );
  assert.ok(
    /\/tmp\/security-audit-handoff\/dev-gates/.test(clone),
    "the dev-gates clone lands outside the handoff directory, the one place the audit writes"
  );

  // The other half of rotating: the line a run writes for the next one to read. A report
  // that drops it leaves the next run nothing to choose a new position against.
  const report = readFileSync(join(AUDIT, "references", "run-report.md"), "utf8");
  assert.ok(/^Positions: /m.test(report), "run-report.md's shape no longer has a Positions: line");
});

/**
 * The audit writes in two places and neither is public: a private advisory, and a report
 * that goes back to the caller. A run that files a public issue, labels one, opens a pull
 * request or comments on anything has disclosed what the advisory route exists to keep
 * private, and prose alone would not fail anything.
 *
 * The fragments are the spellings such a mistake arrives in, not every spelling it could:
 * a `curl`, a `graphql` mutation or a script would carry none of them. What makes the
 * list worth having anyway is that `gh` is the only client these files name, so the two
 * shapes below are the two a future edit would reach for.
 */
const PUBLIC_WRITES = [
  "gh issue create",
  "gh issue comment",
  "gh issue edit",
  "gh issue close",
  "gh label create",
  "gh pr create",
  "gh pr comment",
  "gh gist create"
];

test("nothing in the audit writes anywhere public", () => {
  for (const file of auditFiles()) {
    const text = readFileSync(file, "utf8");
    for (const fragment of PUBLIC_WRITES) {
      assert.ok(
        !text.includes(fragment),
        `${relative(root, file)} names \`${fragment}\`, and an audit has nowhere public to write`
      );
    }

    // The same write through `gh api`, which no fragment above sees. This is the shape the
    // public per-run record was probed with before it was dropped, so it is the one a
    // re-added public write is likeliest to come back in.
    for (const call of callsNaming(text, "/issues")) {
      assert.ok(
        !/gh api/.test(call) || !/--method[ \t]+(POST|PATCH|PUT|DELETE)/.test(call),
        `${relative(root, file)} writes to the issues API, which is public:${call}`
      );
    }
  }
});

/**
 * The advisory listings in `text`: a `gh api` call on a repository's advisories
 * collection, which is neither a submit (`--method`, or the `reports` subpath) nor a read
 * of one advisory by id. The two specs below ask different questions of the same set, and
 * a set each recognised its own way is one they stop agreeing about: identified by the
 * query string, a listing with no query string is a listing neither of them sees.
 *
 * Both files also discuss the `state` filter in prose while leaving it off the call, which
 * is why these are checked on the calls rather than on the file.
 */
const advisoryListings = (text) =>
  callsNaming(text, "security-advisories").filter(
    (call) =>
      call.includes("gh api") &&
      // The method, not the flag: `--method GET` is a listing spelled the long way, and
      // exempting everything that names `--method` would exempt the one call a listing
      // spec is for.
      !/--method[ \t]+(POST|PATCH|PUT|DELETE)/.test(call) &&
      !/security-advisories\/(reports|\{|\$)/.test(call)
  );

/**
 * History is never filtered by state, and for advisories the filter is the only one the
 * endpoint has. An advisory is `closed` or `withdrawn` once its owner has decided it, and
 * a decision is the history a run most needs: filtered out, a declined finding reads as a
 * finding nobody has seen and gets filed again, which is the one outcome the disposition
 * table exists to prevent. `withdrawn` cannot even be asked for.
 */
test("no advisory listing filters by state", () => {
  let checked = 0;
  for (const file of auditFiles()) {
    for (const call of advisoryListings(readFileSync(file, "utf8"))) {
      assert.ok(
        !/[?&]state=/.test(call),
        `${relative(root, file)}: an advisory listing filters by state:${call}`
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, "no advisory listing left to check");
});

/**
 * The listing's page, which is the other half of reading history: `gh api` returns one
 * page by default, and a run that reads the first page of a repository's advisories draws
 * the same conclusion from a truncated answer as from a complete one.
 *
 * The credential probe is the exception, and `-i` is what distinguishes it: it exists to
 * read a response header and a status code, so what comes back in the body is not history
 * and paging through it would be the one thing the probe must not do, which is work.
 *
 * Counted, like the spec above: every listing here is either the probe or a read of
 * history, so a run with nothing left to check means the extractor stopped matching, and
 * an empty loop is the one way a spec about a flag passes on a call that dropped it.
 */
test("every advisory listing that reads history pages through it", () => {
  let checked = 0;
  for (const file of auditFiles()) {
    for (const call of advisoryListings(readFileSync(file, "utf8"))) {
      if (/\s-i\s/.test(call)) continue; // the probe: a status code, not history
      assert.ok(
        call.includes("--paginate"),
        `${relative(root, file)}: a history listing reads one page:${call}`
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, "no history listing left to check");
});

/**
 * The rows of one markdown table of `text`, by the heading its first column carries, as
 * the text of each row's first cell.
 *
 * Sliced from that header rather than read off the whole file, for the reason the severity
 * rubric is: any other table would otherwise contribute cells to a spec about this one and
 * fail it with a sentence about a table nobody meant. The cell is returned verbatim, so a
 * spec decides for itself whether a backtick or a bold marker is part of the value.
 */
const tableRows = (text, firstColumn) => {
  const lines = text.split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith(`| ${firstColumn} |`));
  if (header === -1) return undefined;
  const end = lines.findIndex((line, at) => at > header && !line.startsWith("|"));
  return lines
    .slice(header + 2, end === -1 ? undefined : end)
    .map((row) => row.split("|")[1]?.trim())
    .filter((cell) => cell);
};

/**
 * Every cell of every row of the table `tableRows` finds, trimmed, for a spec that needs
 * more than the first column: a mapping is a pair, and the key alone passes on a value
 * nobody checked.
 */
const tableCells = (text, firstColumn) => {
  const lines = text.split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith(`| ${firstColumn} |`));
  if (header === -1) return undefined;
  const end = lines.findIndex((line, at) => at > header && !line.startsWith("|"));
  return lines
    .slice(header + 2, end === -1 ? undefined : end)
    .map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells[0]);
};

/**
 * The issue run's value tiers, which do for it what the severity rubric does for the
 * audit: decide whether a candidate is filed, and as what, off a table rather than per
 * finding. Unlike severity these answer to no API, so nothing outside this spec would
 * notice a tier renamed, dropped, or quietly added to widen what a run may file.
 *
 * `cosmetic` is the load-bearing one and the reason the set is pinned in both directions.
 * It exists to be named and refused: a run under pressure to fill its cap reaches for the
 * candidate with no cost shown, and a floor can only exclude a tier the table has.
 */
const TIERS = ["structural", "recurring", "local", "cosmetic"];

test("the issue run's tiers are the four it files against", () => {
  const skill = readFileSync(join(ISSUES, "SKILL.md"), "utf8");

  const rows = tableRows(skill, "tier");
  assert.ok(rows, "issue-discovery/SKILL.md has no tier table");
  assert.deepEqual(
    [...rows].sort(),
    TIERS.map((tier) => `\`${tier}\``).sort(),
    `the tiers are ${rows.join(", ") || "none"}`
  );

  // Where the floor starts, and the one place it may be moved to. A floor stated as a tier
  // the table does not have is a floor nothing can be compared against, and a floor that
  // may move below `local` is the bundle filling itself from `cosmetic`.
  //
  // Read with the guardrail block removed, which is the half of this that is easy to get
  // wrong: the block restates these rules deliberately, so a spec over the whole file
  // passes on a body that lost them and reports the summary as though it were the rule.
  // Each copy is pinned by its own spec, and this one owns the body's.
  //
  // `assert.ok` over a regex rather than `assert.match`, as above: the subject is a whole
  // file, and `assert.match` prints it as the actual value.
  const prose = unwrapped(skill.replace(/<!-- guardrail:start -->[\s\S]*/, ""));
  assert.ok(
    /The floor is `min_tier`, and it starts at `local`/.test(prose),
    "issue-discovery/SKILL.md no longer states where the floor starts"
  );
  assert.ok(
    prose.includes("only to `recurring`"),
    "issue-discovery/SKILL.md no longer bounds how far the floor may be raised"
  );
  assert.ok(
    prose.includes("`cosmetic` is never filed at any floor"),
    "issue-discovery/SKILL.md no longer refuses `cosmetic` outright"
  );
});

/**
 * The kinds, and what each owes to be Confirmed. A kind is what decides the evidence and
 * the label, so the set is pinned in both directions: a kind dropped narrows the run in
 * silence (losing `bug` is how a confirmed defect gets turned down as "not this run's
 * business"), and a kind added without a row is one a run can file on no stated bar.
 *
 * Each kind also needs a label in the reference, checked here rather than by eye: a kind
 * with no label is a `gh issue create` that has to guess one, and a guessed label is one
 * the run may have created.
 */
const KINDS = ["bug", "test", "docs", "refactor"];

/**
 * The label each kind is filed under, pinned whole. A label is the one index a person finds
 * these issues by without reading a trailer, and the run creates none, so a kind moved to a
 * label some repository lacks is a create that drops it or guesses. All three are GitHub
 * defaults, present in every repository of the train: `references/issue-api.md` says how
 * that was read.
 */
const LABELS = { bug: "`bug`", test: "`enhancement`", docs: "`documentation`", refactor: "`enhancement`" };

test("every kind the issue run files has its evidence bar and its label", () => {
  const skill = readFileSync(join(ISSUES, "SKILL.md"), "utf8");
  const rows = tableRows(skill, "kind");
  assert.ok(rows, "issue-discovery/SKILL.md has no evidence table keyed on kind");
  assert.deepEqual(
    [...rows].sort(),
    KINDS.map((kind) => `**${kind}**`).sort(),
    `the kinds with an evidence bar are ${rows.join(", ") || "none"}`
  );

  const labels = tableCells(
    readFileSync(join(ISSUES, "references", "issue-api.md"), "utf8"),
    "kind"
  );
  assert.ok(labels, "issue-api.md has no label table keyed on kind");
  assert.deepEqual(
    Object.fromEntries(labels.map(([kind, label]) => [kind, label])),
    LABELS,
    `the labels are ${labels.map((cells) => cells.join(" → ")).join(", ") || "none"}`
  );
});

/**
 * The behaviour classes, which are the whole of what a refactor may propose: a change
 * outside them is a feature request, or a bug judged on the bug's own bar.
 *
 * Pinned in both directions. A class dropped narrows the run silently (losing
 * `narrowed, with a guard` would lose the deletion the caller most wants), and a class
 * added is the way a breaking change arrives looking like one of these.
 */
const BEHAVIOUR = ["none", "little, for the better", "narrowed, with a guard"];

test("a refactor proposes only the three behaviour classes", () => {
  const skill = readFileSync(join(ISSUES, "SKILL.md"), "utf8");
  const rows = tableRows(skill, "behaviour");
  assert.ok(rows, "issue-discovery/SKILL.md has no behaviour table");
  assert.deepEqual(
    [...rows].sort(),
    BEHAVIOUR.map((kind) => `\`${kind}\``).sort(),
    `the behaviour classes are ${rows.join(", ") || "none"}`
  );
});

/**
 * What a refactor may remove, and what it owes for each kind of line. Every line is
 * candidate surface by decision, so this table is the only thing standing where a category
 * exclusion would otherwise be: for code the tests that cover it, for a spec the spec that
 * still pins the rule, for a comment the home that survives.
 *
 * The spec row is why this is pinned rather than left to prose. There is no CI in this
 * repository and `npm run check` is the whole safety net, so a run rewarded for lines
 * removed is pointed straight at it. Dropping this row would not fail anything else here.
 */
const SURFACE = ["**code**", "**a spec**", "**a comment**"];

test("a refactor owes something for every kind of line it removes", () => {
  const skill = readFileSync(join(ISSUES, "SKILL.md"), "utf8");
  const rows = tableRows(skill, "what the finding removes");
  assert.ok(rows, "issue-discovery/SKILL.md has no surface table");
  assert.deepEqual(
    [...rows].sort(),
    [...SURFACE].sort(),
    `the kinds of surface are ${rows.join(", ") || "none"}`
  );
});

/**
 * The issue run's report contract, which is the audit's with two columns added and the
 * redaction rules gone but one. The shared columns are **derived** from the audit's rather
 * than written again, because reading as one table twice is the stated reason they match: a
 * column renamed on one side and not the other now fails here, which is what makes that
 * claim true rather than coincidental. Diverging them deliberately means editing this
 * line, which is the deliberate act the claim deserves.
 *
 * `issues` is this run's own, and it is what makes one row able to hold a finding filed as
 * instances in several repositories. Without it the obvious thing to do with three issue
 * URLs is write three rows, and three rows is three findings against a cap of three.
 * `kind, angle` is the other, and it is what the next run reads to look somewhere new.
 */
const ISSUE_REPORT_COLUMNS = [...REPORT_COLUMNS, "issues", "kind, angle"];

/**
 * The statuses, derived the same way and for the same reason, plus the outcomes this run
 * has and the audit's vocabulary cannot say. `below floor` is this run's because the audit
 * has no floor. The other is a finding confirmed above the floor and deliberately not
 * filed: the caller asked for report-back-only, a destination's history could not be read,
 * or it was handed back for the private route. `filed` would claim a URL that does not
 * exist, and `inconclusive` would deny the confirmation that was reached, so without this
 * an attempt somebody already paid for reads as unknown and the next run buys it again.
 */
const ISSUE_REPORT_STATUSES = [...REPORT_STATUSES, "below floor", "confirmed, not filed"];

test("the issue run's report contract is still written down", () => {
  const report = readFileSync(join(ISSUES, "references", "run-report.md"), "utf8");
  const skill = readFileSync(join(ISSUES, "SKILL.md"), "utf8");

  const header = report.split(/\r?\n/).find((line) => line.startsWith("| hypothesis"));
  assert.ok(header, "run-report.md has no table header starting with the hypothesis column");
  const columns = header.split("|").map((cell) => cell.trim());
  for (const [index, column] of ISSUE_REPORT_COLUMNS.entries()) {
    assert.ok(
      columns[index + 1]?.startsWith(column),
      `report column ${index + 1} is ${JSON.stringify(columns[index + 1])}, not ${column}`
    );
  }

  // The same vocabulary the audit fixes, and for the same reason: the column is read by
  // the next run as much as by a person. Checked as table cells in the vocabulary section,
  // not merely as prose somewhere in the file.
  for (const status of ISSUE_REPORT_STATUSES) {
    assert.ok(
      new RegExp(`^\\|[ \\t]*\`${status}\`[ \\t]*\\|`, "m").test(report),
      `run-report.md's status vocabulary no longer offers \`${status}\``
    );
  }

  // One row is one finding, which is the rule the `issues` column exists to serve. Pinned in
  // the report contract rather than only in the skill, because this is the file somebody
  // writing a report has open.
  assert.ok(
    unwrapped(report).includes("One row is one finding"),
    "run-report.md no longer says a row is a finding rather than an issue"
  );

  // The only measure of whether any of this works. A run files issues and fixes nothing,
  // so a report that counts what it filed and not what was closed reads as progress on a
  // line that is still going the wrong way.
  assert.ok(
    /^Done so far:/m.test(report),
    "run-report.md no longer carries the count of what earlier findings became"
  );

  // What keeps runs from finding what the last one found: without the line, the rotation
  // rule in the skill has nothing to read.
  assert.ok(
    /^Angles:/m.test(report),
    "run-report.md no longer carries which angles a run drew from"
  );

  // A run that ran out of hypotheses once reported a clock that had not stopped it. A fixed
  // set of ways the search ends, running out of angles among them, is what keeps that from
  // being written again: an early end has a name of its own and needs no borrowed one.
  assert.ok(
    /^Stopped at: third confirmation, then deepened \(or: clock, .*; or: angles exhausted, then deepened/m.test(
      report
    ),
    "run-report.md no longer fixes the ways a run's search may end"
  );

  // The join, in the bodies the skill writes rather than in the prose around them: a mention
  // in a paragraph is not a line on a filed issue, and the paragraph is what survives when
  // the template loses the field.
  const body = fencedWith(skill, "markdown", "**In short.**");
  assert.ok(body, "issue-discovery/SKILL.md has no fenced standalone issue body");
  assert.ok(/^Discovery-Run:/m.test(body), "the issue body no longer carries the join");
  assert.ok(
    /^Discovery-Hypothesis:/m.test(body),
    "the issue body no longer carries the attempt it came from, so a lost table cannot be rebuilt"
  );

  // A bundle's items are task-list lines because that is how its disposition stays per item
  // after a fix closes it: an unticked box on a closed bundle is the declined row.
  const bundle = fencedWith(skill, "markdown", "- [ ] **<hypothesis phrase>**");
  assert.ok(bundle, "issue-discovery/SKILL.md has no fenced bundle body with task-list items");
  assert.ok(/^Discovery-Run:/m.test(bundle), "the bundle body no longer carries the join");
});

/**
 * The `gh issue list` calls in `text`: lines naming it **inside a fenced `bash` block**,
 * `\`-continuations rejoined.
 *
 * The fence is the discriminator, and it has to be. `callsNaming` alone is enough for the
 * audit, whose listings are found by a path (`security-advisories`) that its prose happens
 * not to repeat; here the thing being matched is the command's own name, and both files
 * discuss `gh issue list` in sentences about which flags it needs. Those sentences are
 * documentation, not calls, and a spec that fails on one is a spec nobody can satisfy
 * without deleting the explanation.
 */
const bashCalls = (text, command) =>
  [...text.matchAll(/```bash\r?\n([\s\S]*?)```/g)].flatMap(([, body]) =>
    callsNaming(body, command)
  );

const issueListings = (text) => bashCalls(text, "gh issue list");

/**
 * History is never filtered by state, a rule the workspace `AGENTS.md` states
 * under "What earlier runs and earlier people already decided".
 * For issues the default is the filtered one:
 * `gh issue list` shows open issues and says nothing about the closed ones. A closed issue
 * is the history these runs most need, because it is the only place a decision somebody
 * already made is written down. Filtered out, a declined finding reads as one nobody has
 * seen and gets filed again, and a declined proposal gets proposed again.
 */
test("every issue listing reads every state", () => {
  let checked = 0;
  for (const file of issueFilingFiles()) {
    for (const call of issueListings(readFileSync(file, "utf8"))) {
      assert.ok(
        /--state[ \t]+all/.test(call),
        `${relative(root, file)}: an issue listing does not read every state:${call}`
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, "no issue listing left to check");
});

/**
 * The other half of reading history, and this route's version of `--paginate`:
 * `gh issue list` returns thirty rows and says nothing about the rest, so a run reading
 * the default draws the same conclusion from a truncated answer as from a complete one.
 *
 * Counted, like the audit's: an empty loop is the one way a spec about a flag passes on a
 * call that dropped it.
 *
 * The flag alone is not enough, which is why the floor below exists: `--limit 1` carries
 * the flag and reads one row. The floor is not a claim that any repository holds fewer
 * than that many issues, because no number here could be: raising the limit makes the
 * answer bigger and never tells you it is complete. It only keeps the written call clear
 * of the range where truncation is the normal case rather than the exception, and the rule
 * pinned after it is what actually closes the hole.
 */
const LISTING_FLOOR = 100;

test("every issue listing reads more than one page of history", () => {
  let checked = 0;
  for (const file of issueFilingFiles()) {
    for (const call of issueListings(readFileSync(file, "utf8"))) {
      const limit = /--limit[ \t]+(\d+)/.exec(call);
      assert.ok(
        limit,
        `${relative(root, file)}: an issue listing reads the default thirty rows:${call}`
      );
      assert.ok(
        Number(limit[1]) >= LISTING_FLOOR,
        `${relative(root, file)}: an issue listing reads ${limit[1]} rows, under ${LISTING_FLOOR}:${call}`
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, "no issue listing left to check");

  // And the rule that makes a limit safe at all. Without it the run cannot tell a complete
  // answer from a truncated one, and a declined issue it never reached is how the same
  // finding is filed twice: the one outcome the disposition table exists to prevent.
  //
  // One assertion per file, in the words each uses, because the fact is split on purpose:
  // the reference owns why the signal is the only one this route offers, and each skill owns
  // what its run does about it.
  for (const dir of ISSUE_FILING) {
    assert.ok(
      unwrapped(readFileSync(join(dir, "SKILL.md"), "utf8")).includes(
        "A listing as full as its limit is not known to be complete"
      ),
      `${relative(SOURCE, dir)}/SKILL.md no longer says when a history listing is truncated`
    );
  }
  assert.ok(
    unwrapped(readFileSync(join(ISSUES, "references", "issue-api.md"), "utf8")).includes(
      "the only signal of truncation is a listing as full as its limit"
    ),
    "issue-api.md no longer says how a truncated listing is recognised"
  );
});

/**
 * The audit's "nothing writes anywhere public", inverted. These runs' destination *is*
 * public, so what they must not do is reach for anything else: each creates an issue and then
 * leaves every record alone, its own included, because a record that can be amended is no
 * longer the account of the run that wrote it, and closing is the owner's.
 *
 * `security-advisories` is in the list because the other direction is a real mistake too:
 * neither run writes to the private store itself, since a security candidate goes back
 * to its caller for the audit's route, and a skill written beside the audit is one
 * copy-paste from reaching it.
 *
 * The fragments are the spellings such a mistake arrives in, not every spelling it could.
 * What makes the list worth having is that `gh` is the only client these files name. The
 * reference discusses each of these as a REST endpoint deliberately, in prose, which is
 * how it documents a call these runs do not make without naming the command that makes it.
 */
const ISSUE_FORBIDDEN = [
  "gh issue close",
  "gh issue comment",
  "gh issue edit",
  "gh issue reopen",
  "gh issue delete",
  "gh label create",
  "gh pr create",
  "gh pr comment",
  "gh gist create",
  "security-advisories"
];

test("a run that files issues creates one and amends nothing", () => {
  for (const file of issueFilingFiles()) {
    const text = readFileSync(file, "utf8");
    for (const fragment of ISSUE_FORBIDDEN) {
      assert.ok(
        !text.includes(fragment),
        `${relative(root, file)} names \`${fragment}\`, which a discovery run does not call`
      );
    }

    // The same writes through `gh api`, which no fragment above sees. A POST to the issues
    // collection is how a finding is filed and how the capability is probed, so it is the
    // one method allowed here, and only as the probe: `-i` is what makes it one, since the
    // probe exists to read a status code and a response header. Everything else on that
    // path edits a record that already exists.
    for (const call of callsNaming(text, "/issues")) {
      if (!/gh api/.test(call)) continue;
      assert.ok(
        !/--method[ \t]+(PATCH|PUT|DELETE)/.test(call),
        `${relative(root, file)} edits an existing issue through the API:${call}`
      );
      assert.ok(
        !/--method[ \t]+POST/.test(call) || /\s-i\s/.test(call),
        `${relative(root, file)} posts to the issues API outside the probe:${call}`
      );
    }
  }
});

/**
 * The evidence classes a proposal's forecast is written in, which do for
 * `restructure-discovery` what the severity rubric does for the audit and the value tiers do
 * for the issue run: fix the vocabulary, so a claim is labelled off the artifact behind it
 * rather than off how confident the sentence sounds.
 *
 * Pinned in both directions. A class dropped leaves a claim with nowhere honest to sit, and a
 * class added is how the two checkable ones get a softer neighbour to hide in.
 *
 * `measured` and `demonstrated` are the load-bearing pair: they are the two a reader can
 * re-check without trusting the run, which is why one of them has to carry a gain before
 * anything is filed. Without that rule the four classes are a vocabulary for labelling
 * opinions, and this run becomes a generator of them.
 */
const EVIDENCE_CLASSES = ["measured", "demonstrated", "derived", "judged"];

test("the restructure run labels every forecast claim with one of four evidence classes", () => {
  const skill = readFileSync(join(RESTRUCTURE, "SKILL.md"), "utf8");
  const rows = tableRows(skill, "class");
  assert.ok(rows, "restructure-discovery/SKILL.md has no table keyed on class");
  const named = rows.map((cell) => cell.replace(/`/g, ""));

  for (const cls of EVIDENCE_CLASSES) {
    assert.ok(named.includes(cls), `the class table no longer offers \`${cls}\``);
  }
  for (const cell of named) {
    assert.ok(
      EVIDENCE_CLASSES.includes(cell),
      `the class table offers \`${cell}\`, which is not one of the four a claim may carry`
    );
  }

  // The gate itself, read with the guardrail block removed, which is the half of this that is
  // easy to get wrong: a rule stated only in the block reads as a summary of prose that is no
  // longer there.
  const prose = unwrapped(skill.replace(/<!-- guardrail:start -->[\s\S]*/, ""));
  assert.ok(
    prose.includes("At least one gain is `measured` or `demonstrated`"),
    "restructure-discovery/SKILL.md no longer requires a gain a reader can check"
  );
  assert.ok(
    prose.includes("A class is a kind of evidence, not a degree of belief"),
    "restructure-discovery/SKILL.md no longer says a class is evidence rather than confidence"
  );
  // Both halves of the refusal. The numeric one is obvious; the qualitative one is the form a
  // rating comes back in once a number is forbidden, and it is the one a later edit adds
  // without noticing it has added a score.
  assert.ok(
    prose.includes("No percentage, no score, and no qualitative confidence either"),
    "restructure-discovery/SKILL.md no longer refuses a rating in both its forms"
  );

  const forecast = unwrapped(readFileSync(join(RESTRUCTURE, "references", "forecast.md"), "utf8"));
  assert.ok(
    forecast.includes("At least one gain is `measured` or `demonstrated`"),
    "forecast.md no longer requires a gain a reader can check"
  );
  assert.ok(
    forecast.includes("No qualitative rating either"),
    "forecast.md no longer refuses a qualitative rating"
  );
  // The two rules that keep an outside source in its place: it earns `demonstrated` about
  // somebody else's experience and never stands in for a count of what is here, and a version
  // nobody read is not evidence of anything.
  assert.ok(
    forecast.includes("A version is read, not recalled"),
    "forecast.md no longer refuses a remembered version"
  );
  assert.ok(
    forecast.includes("A page never carries the present-state measurement"),
    "forecast.md no longer keeps an outside page out of the present-state measurement"
  );
});

/**
 * The metric, and the two rules that keep a tailored one from hardening into a required set.
 *
 * The failure this prevents is slow and would never fail anything else: a list of examples
 * read as a checklist, then reported by every proposal, then compared across proposals, until
 * a proposal is written to the metrics that exist rather than to what its change would buy.
 * The report's own refusal of a metric column is the structural half of that, so it is pinned
 * beside the prose.
 */
test("the restructure run's metric is chosen per proposal and tallied nowhere", () => {
  const forecast = unwrapped(readFileSync(join(RESTRUCTURE, "references", "forecast.md"), "utf8"));
  assert.ok(
    forecast.includes("No metric is required of any proposal"),
    "forecast.md no longer says the metric is the proposal's own"
  );
  assert.ok(
    forecast.includes("names one observable metric chosen for the opportunity in front of it"),
    "forecast.md no longer requires an observable metric chosen for the opportunity"
  );
  // A forecast with no read-back is a sentence that can never be wrong, which is the one kind
  // of claim this whole contract exists to refuse.
  assert.ok(
    forecast.includes("A forecast nobody can read back is not a forecast"),
    "forecast.md no longer requires that a metric be re-evaluated afterwards"
  );
  assert.ok(
    forecast.includes("Nothing is tallied across proposals"),
    "forecast.md no longer refuses a comparison across proposals"
  );

  const report = unwrapped(readFileSync(join(RESTRUCTURE, "references", "run-report.md"), "utf8"));
  assert.ok(
    report.includes("No metric values are carried in the table"),
    "run-report.md no longer keeps metric values out of the rolling table"
  );
});

/**
 * The boundary between the two runs that read these repositories at rest, and the rule that
 * keeps a boundary from eating findings.
 *
 * Both halves are pinned because both have failed. A boundary drawn on what a fix costs sent a
 * release-train bug to the wrong run and kept a one-line dependency swap out of the right one,
 * so the refusal list is checked as prose rather than left to the guardrail summary. And a
 * boundary with no third disposition left a candidate that fitted neither run filed nowhere,
 * which is why "nothing is dropped" is a rule here and a handover phrase in the sibling
 * (pinned in `GUARDRAILS["issue-discovery"]`).
 */
test("the restructure run's boundary is the search, and nothing falls through it", () => {
  const skill = readFileSync(join(RESTRUCTURE, "SKILL.md"), "utf8");
  const prose = unwrapped(skill.replace(/<!-- guardrail:start -->[\s\S]*/, ""));

  assert.ok(
    prose.includes('Does the finding say "this is wrong", or "there is a better way"?'),
    "restructure-discovery/SKILL.md no longer asks the one question that routes a candidate"
  );
  for (const refused of [
    "not the effort the change would take",
    "not whether it needs a release train",
    "not the size of a migration",
    "not whether a published surface moves",
    "not which structural pattern the diff matches"
  ]) {
    assert.ok(
      prose.includes(refused),
      `restructure-discovery/SKILL.md no longer refuses a change-shape test: ${refused}`
    );
  }
  // The sentence that keeps the refusal from being read as a new bar in the other direction.
  assert.ok(
    prose.includes("A bug whose fix needs a release train and a Durable Object migration is still a wrongness"),
    "restructure-discovery/SKILL.md no longer sends an expensive defect back to the issue run"
  );

  assert.ok(
    prose.includes("Nothing is dropped at the boundary"),
    "restructure-discovery/SKILL.md no longer promises every candidate a destination"
  );
  assert.ok(
    prose.includes("Doubt resolves towards recording"),
    "restructure-discovery/SKILL.md no longer says which way an unclear candidate goes"
  );

  // The scope, which is the other thing a run looking for a better foundation drifts out of:
  // into a feature on one side, and into taking something away on the other. The
  // concept-versus-capability line is what makes the rule usable rather than a slogan.
  assert.ok(
    prose.includes("A proposal adds no feature and removes nothing a consumer or an end user relies on"),
    "restructure-discovery/SKILL.md no longer bounds what a proposal may change"
  );
  assert.ok(
    prose.includes("A capability somebody depends on may not"),
    "restructure-discovery/SKILL.md no longer separates a concept from a capability"
  );
});

/**
 * Outside reading, and the stop condition that comes with requiring it.
 *
 * A run that cannot reach the web has no way to say what current practice is, and the
 * tempting failure is to file anyway on what the repositories and the registry alone show.
 * So the probe runs before the window is spent and its failure ends the run, which is a
 * decision the owner made in words and the only one of this run's capability checks that
 * nothing else in the workspace would catch.
 *
 * Checked as prose rather than as a fenced command, unlike the audit's clone: the route is a
 * tool call rather than a shell command, so there is nothing to fence and a spec demanding a
 * block would only be satisfied by writing the wrong client into the skill.
 */
test("the restructure run owes outside reading, and stops when it cannot do it", () => {
  const skill = readFileSync(join(RESTRUCTURE, "SKILL.md"), "utf8");
  const prose = unwrapped(skill.replace(/<!-- guardrail:start -->[\s\S]*/, ""));

  assert.ok(
    prose.includes("Outside reading is required of every proposal"),
    "restructure-discovery/SKILL.md no longer requires outside reading of every proposal"
  );
  assert.ok(
    prose.includes("No page answering stops the run"),
    "restructure-discovery/SKILL.md no longer stops a run that cannot reach the web"
  );
  // The half that says what stopping means, because a run could otherwise stop and still file
  // what it had, which is the degradation the probe exists to refuse.
  assert.ok(
    prose.includes("Do not file on the repositories and the registry alone"),
    "restructure-discovery/SKILL.md no longer refuses to file without the reading it owes"
  );
  // And that the probe is before the research rather than beside it: finding this out after
  // the window is spent wastes the window.
  assert.ok(
    prose.includes("before anything is researched"),
    "restructure-discovery/SKILL.md no longer probes its capability before spending the window"
  );
});

/**
 * The restructure run's report contract, which is the audit's with two columns added and the
 * redaction rules gone but one. The shared columns and statuses are **derived** from the
 * audit's rather than written again, for the reason the issue run's are: reading as one table
 * twice is the stated reason they match, so a column renamed on one side and not the other
 * fails here.
 *
 * `issues` is shared with the issue run. `move, class` is this run's own, and it carries the
 * two things the next run reads before it picks: which move was taken, and whether what was
 * confirmed rested on something a reader could check.
 *
 * `forecast too thin` is the status this vocabulary needed a sixth value for. `inconclusive`
 * would deny what was established and `ruled out` would claim the hypothesis was tested and
 * failed, when what actually happened is that the case could not be made checkable. Without
 * it the work is lost and the next run buys it again.
 */
const RESTRUCTURE_REPORT_COLUMNS = [...REPORT_COLUMNS, "issues", "move, class"];
const RESTRUCTURE_REPORT_STATUSES = [
  ...REPORT_STATUSES,
  "forecast too thin",
  "confirmed, not filed"
];

test("the restructure run's report contract is still written down", () => {
  const report = readFileSync(join(RESTRUCTURE, "references", "run-report.md"), "utf8");
  const skill = readFileSync(join(RESTRUCTURE, "SKILL.md"), "utf8");

  const header = report.split(/\r?\n/).find((line) => line.startsWith("| hypothesis"));
  assert.ok(header, "run-report.md has no table header starting with the hypothesis column");
  const columns = header.split("|").map((cell) => cell.trim());
  for (const [index, column] of RESTRUCTURE_REPORT_COLUMNS.entries()) {
    assert.ok(
      columns[index + 1]?.startsWith(column),
      `report column ${index + 1} is ${JSON.stringify(columns[index + 1])}, not ${column}`
    );
  }

  for (const status of RESTRUCTURE_REPORT_STATUSES) {
    assert.ok(
      new RegExp(`^\\|[ \\t]*\`${status}\`[ \\t]*\\|`, "m").test(report),
      `run-report.md's status vocabulary no longer offers \`${status}\``
    );
  }

  // The thin-forecast row has to describe the gate it records, and the easy mistake is to
  // describe the worst case instead: a forecast of nothing but `judged` claims. The gate is
  // what one gain *reaches*, so `derived` alone and `derived` mixed with `judged` fail it too,
  // and a row narrower than the gate leaves those hand-backs with no status to be recorded
  // under. Pinned in the gate's own words, so the two cannot drift apart again.
  assert.ok(
    unwrapped(report).includes("no gain came back `measured` or `demonstrated`"),
    "run-report.md's thin-forecast status is narrower than the gate it records"
  );

  // A label is not a decision. The listing this line is read from carries a label and a state
  // and says nothing about who applied either, while approval in this workspace is the label
  // applied by the owner with no later edit by anybody else. Counting labels as approvals
  // would publish an approval nobody verified, in the one line a reader trusts for whether
  // any of this lands.
  assert.ok(
    unwrapped(report).includes("The label is not the approval"),
    "run-report.md no longer separates the `approved` label from the approval check"
  );

  // One row is one attempt, which is what keeps a proposal whose effects reach three
  // repositories from reading as three attempts against a cap of three.
  assert.ok(
    unwrapped(report).includes("One row is one attempt"),
    "run-report.md no longer says a row is an attempt rather than an issue"
  );

  // The join, named at both ends: a column of the table, and a trailer on every issue.
  assert.ok(
    unwrapped(report).includes("The `run (UTC)` column is the `Restructure-Run` timestamp"),
    "run-report.md no longer says which column the issues join on"
  );

  // The three lines a later run reads before it spends a window, and the one a person reads
  // to find out whether any of this lands. `Decisions read:` is the one with no sibling: the
  // moves cannot say which decision was re-checked, so without it a run re-opens the same
  // `AGENTS.md` section under a different move.
  for (const line of ["Moves:", "Decisions read:", "Outside reading:", "Done so far:"]) {
    assert.ok(
      new RegExp(`^${line} `, "m").test(report),
      `run-report.md's shape no longer carries a ${line} line`
    );
  }

  // A fixed set of ways a search ends, running out of moves among them, so an early end has a
  // name of its own and never borrows the clock's.
  assert.ok(
    /^Stopped at: third confirmation, then deepened \(or: clock, .*; or: moves exhausted, then deepened/m.test(
      report
    ),
    "run-report.md no longer fixes the ways a run's search may end"
  );

  // The bodies the skill writes, read as fenced blocks rather than as prose about them: a
  // paragraph describing a field is what survives when the template loses it.
  const body = fencedWith(skill, "markdown", "**The forecast.**");
  assert.ok(body, "restructure-discovery/SKILL.md has no fenced proposal body");
  for (const runIn of [
    "**In short.**",
    "**The decision as it stands.**",
    "**Where we are now.**",
    "**What changed.**",
    "**The forecast.**",
    "**What it would cost us.**",
    "**The alternatives.**",
    "**If it goes well.**",
    "**If it goes badly.**",
    "**Outside reading.**"
  ]) {
    assert.ok(body.includes(runIn), `the proposal body no longer carries ${runIn}`);
  }
  assert.ok(/^Restructure-Run:/m.test(body), "the proposal body no longer carries the join");
  assert.ok(
    /^Restructure-Hypothesis:/m.test(body),
    "the proposal body no longer carries the attempt it came from, so a lost table cannot be rebuilt"
  );

  // The order is the discipline, and it is checkable. Positions are taken on the unwrapped
  // body, like every other phrase here: these templates are wrapped by hand, so a run-in or a
  // phrase straddles a line break as readily as a pinned rule does.
  const flow = unwrapped(body);
  const losses = flow.indexOf("**What it would cost us.**");
  assert.ok(
    losses < flow.indexOf("**The alternatives.**"),
    "the proposal body puts its losses after its alternatives, which makes them a disclaimer"
  );

  // And the position of the recommendation itself, which comparing the two run-ins above does
  // not catch: the opening is where a recommendation gets in by accident, because a summary
  // naturally wants to state the conclusion. One stated before the losses makes every loss
  // after it read as an objection to be answered rather than a cost to be weighed, so the
  // first mention of recommending anything has to come after what the change would cost.
  //
  // Matched on the act and not on the stem: the opening names the word in order to refuse it
  // ("not the recommendation: that is argued below"), and a spec keyed on `recommend` would
  // fail on the very sentence that fixes this.
  const recommends = /run recommends/.exec(flow);
  assert.ok(recommends, "the proposal body never says which direction the run recommends");
  assert.ok(
    recommends.index > losses,
    "the proposal body recommends a direction before naming what it would cost"
  );

  // The forecast run-in is where the metric, its re-evaluation and the class vocabulary meet.
  // Pinned together, because a template that names a metric and never says how to read it
  // back is the unfalsifiable version of this whole document.
  const forecastRunIn = /\*\*The forecast\.\*\*([\s\S]*?)(?:\r?\n){2}/.exec(body);
  assert.ok(forecastRunIn, "the proposal body's forecast run-in is not a paragraph");
  const runIn = unwrapped(forecastRunIn[1]);
  assert.ok(runIn.includes("metric"), "the forecast run-in no longer names a metric");
  assert.ok(
    runIn.includes("re-evaluated"),
    "the forecast run-in no longer says how the metric is read again afterwards"
  );
  for (const cls of EVIDENCE_CLASSES) {
    assert.ok(
      runIn.includes(`\`${cls}\``),
      `the forecast run-in no longer offers the \`${cls}\` class to label a claim with`
    );
  }

  // The bundle, which is how a wrongness this run met on the way reaches a person at all. Its
  // items are task-list lines because that is how its disposition stays per item after a fix
  // closes it, which is the same reason the issue run's are.
  const bundle = fencedWith(skill, "markdown", "- [ ] **<hypothesis phrase>**");
  assert.ok(bundle, "restructure-discovery/SKILL.md has no fenced bundle body with task-list items");
  assert.ok(/^Restructure-Run:/m.test(bundle), "the bundle body no longer carries the join");
});

/**
 * The shared reference is read by every run that files an issue, so a rule in it that names one
 * run's trailer is a rule that misfires for the other.
 *
 * The one that matters is the recovery after a create that answered with an error without
 * saying whether it created anything: the run lists the repository and looks for its own
 * trailer before retrying. Searching for a sibling's spelling matches nothing, and a search
 * that matches nothing reads exactly like a create that did not land, which is how one finding
 * gets two issues. So the file names the trailer as the reading run's and names both
 * spellings, and the trailers are pinned here so a run added later is told which to use rather
 * than inheriting the first run's.
 */
test("the shared issue reference names no single run's trailer as the one to match", () => {
  const api = unwrapped(readFileSync(join(ISSUES, "references", "issue-api.md"), "utf8"));
  assert.ok(
    api.includes("this run's own run trailer"),
    "issue-api.md's failed-create recovery no longer takes the trailer from the reading run"
  );
  assert.ok(
    api.includes("The trailer is the reading run's, not this file's"),
    "issue-api.md no longer says the trailer belongs to the run reading it"
  );
  for (const trailer of ["Discovery-Run", "Restructure-Run"]) {
    assert.ok(
      api.includes(`\`${trailer}\``),
      `issue-api.md does not name the \`${trailer}\` trailer, so a run that writes it has no spelling to match`
    );
  }
});

/**
 * A path a skill points at, as the two spellings these files use: explicitly relative
 * (`../SKILL.md`), or into a skill's own references directory (`references/run-report.md`).
 *
 * Both are resolved from the file that wrote them, which is the whole point: the one that
 * breaks silently is a pointer written at the depth of the wrong file, and a references file
 * naming `../issue-discovery/...` lands one directory short of where it meant. Nothing else
 * in this repository would catch it, since `da-verify-references` is wired in core, plugins
 * and starter and reads code comments rather than markdown prose.
 *
 * Anchored, so a `/tmp` handoff path and a workspace-root path in prose are not read as
 * pointers: neither resolves from the file that names it, and neither is meant to.
 */
const REFERENCED_PATH = /`((?:\.{1,2}\/|references\/)[A-Za-z0-9_.\/-]+\.md)`/g;

test("every file a discovery skill points at is there", () => {
  let checked = 0;
  for (const name of DISCOVERY) {
    for (const file of markdownUnder(join(SOURCE, name))) {
      const text = readFileSync(file, "utf8");
      for (const [, path] of text.matchAll(REFERENCED_PATH)) {
        assert.ok(
          existsSync(resolve(dirname(file), path)),
          `${relative(root, file)} points at \`${path}\`, which does not resolve from there`
        );
        checked += 1;
      }
    }
  }
  // Each skill points at least at its own report contract, so fewer than one apiece is the
  // extractor having stopped matching rather than a run of files that point nowhere.
  assert.ok(checked >= DISCOVERY.length, `only ${checked} pointers found to check`);
});
