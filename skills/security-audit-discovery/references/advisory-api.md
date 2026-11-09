# The advisory calls

`gh` has no advisory command, so every call here is `gh api`. The permission named on
each is the fine-grained one GitHub answers with in `X-Accepted-Github-Permissions`;
reading that header on a refusal is how you tell a missing permission from a missing
role.

## What an advisory cannot carry

A repository security advisory has `ghsa_id`, `summary`, `description`, `severity`,
`state`, `cwe_ids`, `credits`, `collaborating_users` and the rest, and **no `labels`,
assignees or milestones**. The list endpoint filters on `state` alone: no query, no
label, no date range. So there is no index over advisories to look a run up in, which is
why history is read by listing the set and reading the entries, and why the only thing
tying an advisory to a run is a line this skill writes into `description` itself.

## Which credential answered

`SKILL.md` step 3 carries the probe: it posts a body that cannot validate to the advisory
submit endpoint, so it can create nothing, and asks the listing for a single entry, and
takes the answer from the status codes. Which credential gave that answer is the part worth
being precise about when reporting a block.

Which credential that is depends on where the session runs. On a laptop, `gh` acts as
whoever signed it in. In the deployment's container it acts as the deployment: the
container holds a placeholder, and the egress gateway swaps in the Worker's `GITHUB_TOKEN`
binding (see `starter/wrangler.jsonc` and `plugins/src/repo-github/sandbox-egress.ts`). A
scope granted to one does not reach the other, so when reporting a block, name the login
`gh api user --jq .login` answers with and which of the two it is.

## Submit a finding

`POST /repos/{owner}/{repo}/security-advisories/reports` (`repository_advisories=write`)

```bash
gh api --method POST repos/dynamicagents/<repo>/security-advisories/reports \
  --input <prepared-body>.json --jq '{ghsa_id, html_url, state}'
```

`summary` and `description` are required. `severity` **or** `cvss_vector_string`, never
both: the API rejects a body carrying both. `cwe_ids` and `vulnerabilities[]` are
optional, and each entry in `vulnerabilities` needs `package.ecosystem`.
`start_private_fork` stays `false`: this workflow reports, it does not prepare a fix.

The reporter is added by GitHub as a collaborator and credited user on the advisory it
creates. That is what makes the listing and read-back calls below work for this identity.

## History: list, then inspect

`GET /repos/{owner}/{repo}/security-advisories?state=<state>` (`repository_advisories=read`)

```bash
gh api --paginate "repos/dynamicagents/<repo>/security-advisories?per_page=100" \
  --jq '.[] | {ghsa_id, state, summary, created_at, description}'
```

`state` is a filter, not a required argument: left off, every state the caller can see
comes back in one pass, and `state` is on each entry anyway. Listing unpublished
advisories is open to a security manager, an administrator, or a collaborator on that
advisory, which the reporter becomes on filing it.

**A caller outside those roles is not refused, which is the part worth measuring.**
Probed from a session credentialed as a repository collaborator with push and triage and
no admin or maintain role, every repository in the train answers the listing `200` with an
empty array. A repository nothing has been filed in is therefore not a block, and the
failure there is quieter than one: what a `200` establishes is the route, not that the set
is complete, because such a caller sees the advisories it is on and nothing tells it how
many it did not see. With nothing filed anywhere the complete answer and the filtered one
are the same bytes.

That is why step 9 states the limit rather than reading completeness off a status code,
and why the probe in `SKILL.md` step 3 is a capability check and not a history check. A
listing that *is* refused, in a repository this caller cannot read at all, is still a
block: the candidate is handed back rather than filed without the check.

An entry's `state` is `triage`, `draft`, `published`, `closed` or `withdrawn`, and there
is no `state_reason` beside it. The filter takes the first four only: `withdrawn` is a
state an advisory can be in and not one the listing can ask for, which is the second
reason to leave the filter off. Which decision each state stands for is the workspace
`AGENTS.md`'s, under "What earlier runs and earlier people already decided", and the only
prose an advisory carries a reason in is its own body.

**`description` is in the projection because that is where `Audit-Run` and
`Audit-Hypothesis` live.** They are the only machine-readable thing an advisory carries
about the run that filed it: `Audit-Run` joins it to a row of the report table, and
`Audit-Hypothesis` names the attempt it came from, which is what lets a run rebuild the
rows that filed when the report carrying them has expired (`run-report.md`, "When the table
cannot be recovered"). Dropping the field leaves a run reading summaries to guess
which advisory came from where.

Neither is a dedup key, and nothing matches on them. Whether a candidate is a repeat is a
judgement made by reading, against the dispositions in the workspace `AGENTS.md` and
against the attempts the brief carried: `SKILL.md` step 9 and step 10 say why there is no
key here to compute.

`GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}` (`repository_advisories=read`)
reads one in full, once the listing has named it.

## Correcting one already filed: not a call this run makes

`PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}` exists and would take
`summary` and `description` from a collaborator on that advisory. **A discovery run does
not call it**, for the reason it edits no record anywhere: a record that can be amended
is no longer the account of the run that wrote it. A correction is a new advisory naming
the one it supersedes, which is the same move the disposition table asks for when a fixed
finding comes back: the workspace `AGENTS.md`, under "What earlier runs and earlier people
already decided", reached from `SKILL.md` step 9.

There is no advisory-comment endpoint either. A conversation about a report happens in
the web UI, which is the maintainer's to have.

## What is not available

`GET /orgs/{org}/security-advisories` needs `repository_advisories=write` **and** org
owner or security manager. A repository collaborator is refused, so there is no
org-wide private query: the audit lists one repository at a time instead. The
global advisory database (`GET /advisories`) holds only published public advisories and
answers nothing about this train.
