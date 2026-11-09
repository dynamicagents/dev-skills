#!/usr/bin/env node
/**
 * Specs for the skills' scripts, run against throwaway repositories in a temporary
 * directory and never against a real workspace: `bootstrap` and `sync` move branches.
 *
 * git is isolated from the machine's own config, so a global signing key, hook or
 * `insteadOf` cannot change what these see. `protocol.file.allow` is what lets a
 * submodule be added from a local path, which git refuses by default.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(root, "skills");
const SUPERPROJECT = join(SKILLS, "superproject", "scripts");

const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "protocol.file.allow",
  GIT_CONFIG_VALUE_0: "always",
  GIT_AUTHOR_NAME: "spec",
  GIT_AUTHOR_EMAIL: "spec@example.invalid",
  GIT_COMMITTER_NAME: "spec",
  GIT_COMMITTER_EMAIL: "spec@example.invalid"
};

const git = (args, cwd) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const node = (script, args, cwd) => spawnSync("node", [script, ...args], { cwd, env, encoding: "utf8" });

const scratch = () => mkdtempSync(join(tmpdir(), "dev-skills-"));

/** Every runnable script: a file under a skill's `scripts/` that starts with a shebang. */
const scripts = () =>
  readdirSync(SKILLS).flatMap((skill) => {
    const dir = join(SKILLS, skill, "scripts");
    let files = [];
    try {
      files = readdirSync(dir);
    } catch {
      return [];
    }
    return files
      .filter((f) => f.endsWith(".mjs") && readFileSync(join(dir, f), "utf8").startsWith("#!"))
      .map((f) => join(dir, f));
  });

test("every script answers --help without touching anything", () => {
  const cwd = scratch();
  try {
    const found = scripts();
    assert.ok(found.length > 0, "no scripts found");
    for (const script of found) {
      const run = node(script, ["--help"], cwd);
      assert.equal(run.status, 0, `${script} --help exited ${run.status}: ${run.stderr}`);
      assert.match(run.stdout, /^Usage: /, `${script} --help printed no usage`);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a superproject script refuses a directory that is not a workspace", () => {
  const cwd = scratch();
  try {
    for (const name of ["bootstrap.mjs", "sync.mjs", "submodules.mjs", "skills.mjs"]) {
      const run = node(join(SUPERPROJECT, name), [], cwd);
      assert.equal(run.status, 1, `${name} exited ${run.status} outside a workspace`);
      assert.match(run.stderr, /not a workspace/, `${name} did not say why`);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

/**
 * A workspace with one submodule, `sub`, declared on `main`, whose remote is a bare
 * repository in the same scratch directory.
 */
const workspace = () => {
  const dir = scratch();
  const remote = join(dir, "sub.git");
  const seed = join(dir, "seed");
  git(["init", "--bare", "-b", "main", remote], dir);
  git(["init", "-b", "main", seed], dir);
  writeFileSync(join(seed, "README.md"), "sub\n");
  git(["add", "."], seed);
  git(["commit", "-m", "first"], seed);
  git(["push", remote, "main"], seed);

  const ws = join(dir, "ws");
  git(["init", "-b", "main", ws], dir);
  git(["submodule", "add", "-b", "main", remote, "sub"], ws);
  git(["commit", "-m", "add sub"], ws);
  return { dir, ws, sub: join(ws, "sub") };
};

/** `sub` on a pushed feature branch, clean, with one commit `main` does not have. */
const onFeature = (sub) => {
  git(["checkout", "-b", "feature"], sub);
  writeFileSync(join(sub, "feature.txt"), "feature\n");
  git(["add", "."], sub);
  git(["commit", "-m", "feature"], sub);
  git(["push", "-u", "origin", "feature"], sub);
};

test("sync moves a clean submodule off a branch its remote deleted, and keeps the branch", () => {
  const { dir, ws, sub } = workspace();
  try {
    onFeature(sub);
    git(["push", "origin", "--delete", "feature"], sub);

    const run = node(join(SUPERPROJECT, "sync.mjs"), [], ws);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /left `feature`, deleted upstream/);
    assert.equal(git(["symbolic-ref", "--short", "HEAD"], sub), "main");
    assert.ok(git(["branch", "--list", "feature"], sub).includes("feature"), "the branch was deleted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sync leaves a submodule on a branch its remote still has", () => {
  const { dir, ws, sub } = workspace();
  try {
    onFeature(sub);

    const run = node(join(SUPERPROJECT, "sync.mjs"), [], ws);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /on `feature`, not `main` — left alone/);
    assert.equal(git(["symbolic-ref", "--short", "HEAD"], sub), "feature");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skills --check passes a linked skill and fails an unlinked one", () => {
  const { dir, ws } = workspace();
  try {
    const add = (name) => {
      mkdirSync(join(ws, ".agents", "skills", name), { recursive: true });
      writeFileSync(join(ws, ".agents", "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: d\n---\n`);
    };
    add("linked");
    mkdirSync(join(ws, ".claude", "skills"), { recursive: true });
    symlinkSync(join("..", "..", ".agents", "skills", "linked"), join(ws, ".claude", "skills", "linked"));

    const check = join(SUPERPROJECT, "skills.mjs");
    assert.equal(node(check, ["--check"], ws).status, 0);

    add("unlinked");
    const failing = node(check, ["--check"], ws);
    assert.equal(failing.status, 1);
    assert.match(failing.stderr, /unlinked is not linked/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the pull-request scripts refuse arguments that name nothing, before calling GitHub", () => {
  const cwd = scratch();
  try {
    const dir = join(SKILLS, "pull-requests", "scripts");
    const threads = node(join(dir, "threads.mjs"), ["not a repo", "1"], cwd);
    assert.equal(threads.status, 1);
    assert.match(threads.stderr, /is not a repository/);

    const status = node(join(dir, "copilot-status.mjs"), ["core", "abc"], cwd);
    assert.equal(status.status, 1);
    assert.match(status.stderr, /is not a pull request number/);

    const reply = node(join(dir, "reply-resolve.mjs"), ["PRRT_x"], cwd);
    assert.equal(reply.status, 1);
    assert.match(reply.stderr, /Pass the reply/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
