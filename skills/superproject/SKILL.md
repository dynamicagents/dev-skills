---
name: superproject
description: >-
  Rules and scripts for a Dynamic Agents workspace, a repository whose other repositories are
  git submodules (dev-agents, dev-gates): bootstrapping a clone, putting submodules back on
  their branches after a merge, HTTPS submodule urls with SSH as a local preference, when a
  submodule pointer moves, and the skills a workspace installs. Use when cloning, bootstrapping
  or syncing a workspace, when a submodule is on a detached HEAD or a merged branch, when
  editing .gitmodules or committing a gitlink, and when adding, removing or updating a
  workspace's skills.
---

# Working in a workspace

A workspace is a repository whose other repositories are its git submodules. The workspace's
own `AGENTS.md` says which repositories those are and how they relate. This skill holds what
every workspace does the same way, and the scripts that do it.

The scripts run from the workspace root, which is where `npm run` runs them, and each takes
`--help`. A workspace's `package.json` points its scripts here:

| npm script | runs | what it does |
| --- | --- | --- |
| `npm run bootstrap` | `scripts/bootstrap.mjs` | submodule urls, init, flattened symlinks, every submodule on its branch, `npm ci` where `node_modules` is empty, then the skill links. **Run it first.** |
| `npm run sync` | `scripts/sync.mjs` | every submodule on its declared branch, fast-forwarded |
| `npm run submodules:check` | `scripts/submodules.mjs` | the submodules would survive a clone |
| `npm run skills` | `scripts/skills.mjs` | every skill in `.agents/skills/` linked into `.claude/skills/` |
| `npm run skills:check` | `scripts/skills.mjs --check` | the same, changing nothing |

## Never on a detached HEAD

`bootstrap` and `sync` leave every submodule **on the branch `.gitmodules` declares**, and never
on a detached HEAD. Plain `git submodule update`, and `git clone --recurse-submodules`, check out
the recorded *commit*, and a commit is not a branch: they detach you, and the next commit you
write goes somewhere no branch can see. Run `npm run sync` after merging a PR in one of the
submodules, and it fetches, checks out the branch and fast-forwards.

Neither touches a submodule with uncommitted changes, or one checked out onto a feature branch
that is still on GitHub. Merging a PR deletes its branch, and `sync` takes that as finished: it
moves a clean submodule off it onto the declared branch, and keeps the branch.

## Remotes are HTTPS, and SSH is yours alone

`.gitmodules` spells every url `https://github.com/…`, and `npm run submodules:check` fails
anything but that or a relative path. A relative url resolves against the workspace's own
remote, so it arrives by whatever transport the clone used. A committed url has to work in the
least-equipped place that will ever read it, and that is not a laptop: a cloud session holds a
GitHub token and no key, installs no `openssh-client`, and reaches the network through an HTTP
gateway that carries no SSH at all. A token cannot be turned into a key from inside such a
session, so a `git@github.com:` url there is not slow or awkward. It is unreachable.

Preferring SSH is a *local* matter, and git has the mechanism:

```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

Every fetch and push to GitHub then goes over SSH while the recorded url stays HTTPS. `git clone`
records the url it was **given**, not the rewritten one, so this changes no file and nothing
about it is committed.

**It has to be global.** A submodule is its own repository: git inside one reads that
submodule's config and yours, never the superproject's, so a rewrite in the workspace's
`.git/config` works for the workspace and silently not for the submodules underneath it. Scope
it with an `includeIf.gitdir:` include if you want it narrower than every GitHub repo you own.

An existing checkout keeps whatever url `git submodule init` copied into it until
`git submodule sync --recursive` moves it. `npm run bootstrap` runs that first, so re-running it
is enough.

**A `git+ssh://` line in a submodule's `package-lock.json` is not the same problem**, and
changing it makes things worse. npm records the ssh spelling for a GitHub dependency because
that is what pacote's `repoUrl()` returns for a hosted repo, then downloads the codeload HTTPS
tarball rather than cloning, precisely because the two match. Spell it `git+https://` and they
stop matching, and npm falls back to a real clone.

## The submodule pointers

A pointer is a **known-good combination**, not a mirror of each submodule's branch. Every commit
in a submodule makes its pointer stale, and that is the design: a bump is deliberate. It needs
the repositories it combines green together, and it waits for the workspace's owner to ask for
one.

**A PR whose only change is a gitlink is never opened unprompted.** A green run makes a bump
possible, not due, and re-pinning on that alone spends a review to decide nothing.

`npm run sync` moves the checkouts and tells you which are ahead of their pin; advancing a pin
is a separate `git add` and a commit that says so. `npm run submodules:check` deliberately does
not fail on staleness. It checks only that the submodules would survive a clone, and
`--pushed` adds the one check that needs the network: that every recorded pointer is on a
remote branch, so a clone by anybody else can fetch it.

## Symlinks a clone flattened

`CLAUDE.md -> AGENTS.md`, and every entry in `.claude/skills/`, is a symlink. On a filesystem
where git's first probe for symlink support failed, a clone checks each one out as a plain file
holding the target's name, and `git status` calls that clean. `bootstrap` and `sync` repair it:
`scripts/symlinks.mjs` says how, and why it leaves alone anything that is not exactly what git
wrote.

## The skills a workspace installs

`.agents/skills/<name>/` holds each skill and `.claude/skills/<name>` is a relative link to it,
which is where Claude Code looks. The skills CLI writes both, and `skills-lock.json`:

```bash
DISABLE_TELEMETRY=1 npx skills add <owner/repo> --skill <name> -a universal claude-code -y
DISABLE_TELEMETRY=1 npx skills remove <name> -y
npm run skills    # links whatever the CLI did not
```

**Both agents, every time.** `universal` is `.agents/skills/` and `claude-code` is
`.claude/skills/`. Given both, the CLI writes the skill once into the first and links it from
the second. Given only `claude-code`, it copies the skill into `.claude/skills/` and writes
nothing in `.agents/skills/`. Given only `universal`, there is no link, and Claude Code does not
announce a skill it never found, which is why `npm run check` runs `skills:check`.
`DISABLE_TELEMETRY=1` keeps the CLI from reporting the install to skills.sh.

- **The installed copies are committed.** A clone has to carry its skills: a session reads them
  as it starts, and a host listing a checkout's skills reads them straight after the clone,
  before any install has run.
- **A skill from `dynamicagents/dev-skills` is edited there, never in an installed copy.** The
  next update overwrites the copy, and the edit with it.
- **Keeping them current is part of the dependency round**, committed in the round's workspace
  PR:

  ```bash
  DISABLE_TELEMETRY=1 npx skills check           # exits 1 when an installed skill has an update
  DISABLE_TELEMETRY=1 npx skills update -p -y    # refresh the copies and skills-lock.json
  npm run skills && npm run check
  ```

  A source that no longer publishes a skill fails its update. Remove that skill rather than
  keep a copy nobody can refresh.
