// Zero-dependency anti-slop copy guard for the personal site.
// Enforces the design pass rules as executable checks so they cannot
// silently regress. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const appDir = new URL("../app/", import.meta.url).pathname;
const files = readdirSync(appDir).filter((f) => /\.(tsx?|css)$/.test(f));
const source = files
  .map((f) => readFileSync(join(appDir, f), "utf8"))
  .join("\n");

test("zero em-dashes and en-dashes anywhere in the UI source", () => {
  assert.equal(source.includes("\u2014"), false, "em-dash (—) is banned");
  assert.equal(source.includes("\u2013"), false, "en-dash (–) is banned");
});

test("no AI-tell labels or motifs", () => {
  for (const banned of [
    "Scroll to explore",
    "Scroll down",
    "Step 1",
    "BETA",
    "INVITE",
    "SKX",
    "skx.si",
    "Hi, I'm",
  ]) {
    assert.equal(source.includes(banned), false, `banned string present: ${banned}`);
  }
});

test("exact user copy preserved verbatim", () => {
  for (const line of [
    "CS @ UC San Diego.",
    "I like building AI systems, software,",
    "and things that are ",
    "Selected work",
    "MiniServe",
    "Inference engine built from scratch.",
    "C++ · Metal · inference",
    "Orvia",
    "Operations software for distributors.",
    "Next.js · Postgres · AI",
    "Cacheyard",
    "In-memory cache server.",
    "C++ · TCP · caching",
  ]) {
    assert.equal(source.includes(line), true, `user copy missing: ${line}`);
  }
});

test("project links point at real destinations, not invented URLs", () => {
  for (const href of [
    "https://github.com/skcache/miniserve",
    "https://orviaops.com",
    "https://github.com/skcache/cacheyard",
    "https://github.com/skcache",
    "https://x.com/skcache",
  ]) {
    assert.equal(source.includes(href), true, `verified href missing: ${href}`);
  }
});