#!/usr/bin/env node
/**
 * Every skill here against the Agent Skills specification (https://agentskills.io/specification),
 * as its reference validator applies it: `skills-ref`'s `validator.py`, at
 * https://github.com/agentskills/agentskills/blob/83021e2be457a9b6679148719c1f6074f0ad975e/skills-ref/src/skills_ref/validator.py
 *
 * Claude Code drops a skill whose frontmatter it cannot parse **without reporting it**, and so
 * does the skills CLI that installs these: a skill that stopped loading looks exactly like a
 * skill that was never useful. So the frontmatter is held to the spec here, before any
 * workspace installs it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { frontmatter, metadataOf, skillNames } from "./frontmatter.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "skills");
const skills = skillNames(SOURCE);
const read = (name) => readFileSync(join(SOURCE, name, "SKILL.md"), "utf8");

/** The spec's fields. A field outside these and {@link EXTENSIONS} fails. */
const SPEC_FIELDS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];

/**
 * Fields the spec does not define and these skills need anyway, each with what it buys. An
 * entry costs a strict validator's approval, so each one names the client that reads it.
 */
const EXTENSIONS = {
  // Claude Code: the skill loads only when a caller names it, never off its description. A
  // discovery run files records, and a model reading "security" in a prompt must not be able
  // to start one.
  "disable-model-invocation": "Claude Code"
};

/** The spec's advice for a `SKILL.md`, not a limit: over it is reported, never failed. */
const ADVISED_LINES = 500;

/**
 * The reader itself, on the values that decide whether a skill loads. A reader this
 * small is only worth having if it is wrong in no case that reaches it, and the cases
 * that reach it are a quoted name and a description that is empty or unterminated.
 */
test("the frontmatter reader agrees with Claude Code on quoted values", () => {
  const fm = (body) => frontmatter(`---\n${body}\n---\n\n# body\n`);

  assert.equal(fm("name: security-audit-discovery").name, "security-audit-discovery");
  assert.equal(
    fm(`name: "security-audit-discovery"`).name,
    "security-audit-discovery",
    "a quoted name is the same name"
  );
  assert.equal(fm("name: 'security-audit-discovery'").name, "security-audit-discovery");

  assert.equal(fm(`description: ""`).description, "", "an empty description is empty");
  assert.equal(fm(`description: "unterminated`).description, undefined);
  assert.equal(
    fm("name: security-audit-discovery").description,
    undefined,
    "absent, not empty"
  );

  assert.equal(
    fm("description: >-\n  first line\n  second line").description,
    "first line second line",
    "a folded scalar is one string"
  );
  assert.equal(frontmatter("# no frontmatter here\n"), null);
});

test("the metadata reader takes one level of string values and flags anything deeper", () => {
  const md = (body) => metadataOf(`---\nname: x\n${body}\n---\n`);

  assert.equal(md("description: y"), null, "absent");
  assert.deepEqual(md('metadata:\n  author: someone\n  version: "1.0"').map, { author: "someone", version: "1.0" });
  assert.deepEqual(md("metadata:\n    four: spaces\n    still: one level").invalid, []);
  assert.deepEqual(md("metadata:\n  nested:\n    key: value").invalid, ["nested:", "key: value"]);
});

test("every skill has a SKILL.md whose name is its directory", () => {
  assert.ok(skills.length > 0, `no skills found in ${SOURCE}`);
  for (const name of skills) {
    const path = join(SOURCE, name, "SKILL.md");
    assert.ok(existsSync(path), `${name}: no SKILL.md`);
    const fm = frontmatter(readFileSync(path, "utf8"));
    assert.ok(fm, `${name}: SKILL.md has no frontmatter block`);
    assert.equal(fm.name, name, `${name}: frontmatter name is ${JSON.stringify(fm.name)}`);
  }
});

/**
 * The spec's name rule: 1-64 characters of lowercase letters, digits and hyphens, with no
 * hyphen at either end and none doubled. The spec's text says `a-z`, and its validator takes
 * any Unicode letter; this holds to the narrower one, which every client accepts.
 */
test("every name is one the spec accepts", () => {
  for (const name of skills) {
    assert.ok(name.length >= 1 && name.length <= 64, `${name}: ${name.length} characters, over 64`);
    assert.match(name, /^[a-z0-9-]+$/, `${name}: only lowercase letters, digits and hyphens`);
    assert.ok(!name.startsWith("-") && !name.endsWith("-"), `${name}: starts or ends with a hyphen`);
    assert.ok(!name.includes("--"), `${name}: consecutive hyphens`);
  }
});

test("every description is one the spec accepts", () => {
  for (const name of skills) {
    const fm = frontmatter(read(name));
    // `fm?.` and not `fm.`: a malformed block fails the spec above with a sentence that
    // names the problem, and this one should not bury it under a TypeError.
    assert.ok(fm?.description?.trim(), `${name}: no description`);
    assert.ok(
      fm.description.length <= 1024,
      `${name}: description is ${fm.description.length} characters, over 1024`
    );
  }
});

test("every field is the spec's, or an extension named here with its reason", () => {
  for (const name of skills) {
    const fm = frontmatter(read(name)) ?? {};
    for (const key of Object.keys(fm)) {
      assert.ok(
        SPEC_FIELDS.includes(key) || key in EXTENSIONS,
        `${name}: \`${key}\` is not a spec field. Add it to EXTENSIONS with the client that reads it, or drop it.`
      );
    }
    if ("compatibility" in fm) {
      assert.ok(
        fm.compatibility.length >= 1 && fm.compatibility.length <= 500,
        `${name}: compatibility is ${fm.compatibility.length} characters, outside 1-500`
      );
    }
    const metadata = metadataOf(read(name));
    if (metadata) {
      assert.deepEqual(metadata.invalid, [], `${name}: metadata maps strings to strings, one level deep`);
    }
  }
});

test("a SKILL.md past the spec's advised length is reported", (t) => {
  for (const name of skills) {
    const lines = read(name).split("\n").length;
    if (lines > ADVISED_LINES) {
      t.diagnostic(`${name}/SKILL.md is ${lines} lines; the spec advises under ${ADVISED_LINES}.`);
    }
  }
});
