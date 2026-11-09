# AGENTS.md: the Dynamic Agents developer skills

The skills, and the scripts inside them, that the Dynamic Agents workspaces install: `dev-agents`
for the train, `dev-gates` for the gates. Each workspace installs what it uses with the skills
CLI and commits the installed copy, so this repository is the one place each of them is
written, and a workspace receives a change when its dependency round updates the copy.

These are for people and agents building Dynamic Agents. Skills for projects built *on* the
framework do not go here.

| skill | what it is |
| ----- | ---------- |
| [`superproject`](skills/superproject/SKILL.md) | a workspace of submodules: bootstrap, sync, remotes, pointers, the skills it installs |
| [`pull-requests`](skills/pull-requests/SKILL.md) | one Copilot review per PR, answered in one pass, and merged once it has landed |
| [`security-audit-discovery`](skills/security-audit-discovery/SKILL.md) | a discovery run that looks for vulnerabilities and files private advisories |
| [`issue-discovery`](skills/issue-discovery/SKILL.md) | a discovery run that looks for bugs, missing tests, docs and refactors, and files issues |
| [`restructure-discovery`](skills/restructure-discovery/SKILL.md) | a discovery run that looks for a better way, and files proposals |

The discovery skills defer to the rules every run shares, which live in dev-agents' `AGENTS.md`
under "Discovery runs", because every run reads the train from there. dev-agents' own spec
checks that those rules and every heading a skill cites are still in that file, against the
installed copy, so a change that moves one of them is a PR here and an update there.

---

## Writing a skill

**A skill follows the Agent Skills specification**, https://agentskills.io/specification. Each
lives in `skills/<name>/`, which is where the skills CLI looks, and `npm run check` holds the
frontmatter to the spec (`test/frontmatter.test.mjs`):

- `name` is the directory's name: lowercase letters, digits and hyphens, at most 64 characters.
- `description` says what the skill does and when to use it, in at most 1024 characters. It is
  all a client reads before deciding to load the skill.
- Only the spec's fields, plus the extensions `EXTENSIONS` in that spec names, each beside the
  client that reads it. `disable-model-invocation` is one: Claude Code then loads the skill
  only when a caller names it.
- `SKILL.md` stays under 500 lines where it can, with detail in `references/` and each file
  named from `SKILL.md` with when to read it. The spec reports a longer one rather than failing
  it.

**A script is a command an agent runs, not a library.** It goes in the skill's `scripts/`, is
named in its `SKILL.md`, and:

- runs on Node with `node:` builtins only, so a workspace installs nothing to run it;
- answers `--help` and never prompts;
- writes its answer to stdout and diagnostics to stderr, and says what failed in a sentence;
- acts on the directory it is run from, never on where the file sits, because the same file is
  installed into every workspace (`skills/superproject/scripts/workspace.mjs` has the why).

`test/scripts.test.mjs` runs every script's `--help`, and runs what moves branches against
throwaway repositories only.

**Edit a skill here, never in an installed copy.** The next update in a workspace overwrites
the copy, and the edit with it. A workspace tries a new skill by writing it into its own
`.agents/skills/` first, and moves it here once it is worth keeping.

---

## How a change reaches a workspace

A merge here changes no workspace. Each one picks it up in its dependency round, as the
`superproject` skill describes under "The skills a workspace installs":

```bash
DISABLE_TELEMETRY=1 npx skills check
DISABLE_TELEMETRY=1 npx skills update -p -y
npm run skills && npm run check
```

and commits the updated copies and `skills-lock.json` in that round's PR.

---

## Working here

```bash
npm run check    # the specs: frontmatter, discovery skills, scripts
```

Prose and comments follow the train's rules in dev-agents' `AGENTS.md`, under "Prose" and
"Comments". Pull requests follow the `pull-requests` skill in this repository: one Copilot
review, answered in one pass, every thread resolved.
