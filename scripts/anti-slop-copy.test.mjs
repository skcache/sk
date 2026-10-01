// Zero-dependency anti-slop copy guard for the personal site.
// Enforces the design pass rules as executable checks so they cannot
// silently regress. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const appDir = new URL("../app/", import.meta.url).pathname;
const files = readdirSync(appDir, { recursive: true }).filter((f) =>
  /\.(tsx?|css)$/.test(String(f))
);
const read = (f) => readFileSync(join(appDir, String(f)), "utf8");
const source = files.map(read).join("\n");
// JSX text nodes use &apos; entities; normalize for copy assertions
const text = source.replace(/&apos;/g, "'");

test("zero em-dashes and en-dashes anywhere in the UI source", () => {
  assert.equal(source.includes("\u2014"), false, "em-dash (—) is banned");
  assert.equal(source.includes("\u2013"), false, "en-dash (–) is banned");
});

test("no resume anywhere: no link, no route, no file reference", () => {
  assert.equal(source.includes("Resume"), false, "Resume must be absent");
  assert.equal(source.includes("resume"), false, "resume must be absent");
});

test("light mode only: no automatic dark mode", () => {
  assert.equal(
    source.includes("prefers-color-scheme"),
    false,
    "dark mode must not exist"
  );
});

test("no corporate or AI-brand copy", () => {
  for (const banned of [
    "passionate",
    "intersection",
    "crafting",
    "innovative",
    "cutting-edge",
    "Seamless",
    "Elevate",
    "Let's build",
    "things that are fast",
    "AI systems and things",
    "Selected work",
    "Hi, I'm",
    "BETA",
    "INVITE",
    "SKX",
  ]) {
    assert.equal(source.includes(banned), false, `banned string present: ${banned}`);
  }
});

test("intro copy preserved verbatim", () => {
  const intro = read("components/Intro.tsx");
  for (const line of [
    "Hey, I'm Siddhant. I'm a fourth-year CS student at",
    "UC San Diego",
    "I'm mostly into",
    "inference",
    ", systems, and building software. Outside of that,",
    "basketball",
    "markets",
    "design",
  ]) {
    assert.equal(text.includes(line), true, `intro copy missing: ${line}`);
  }
  // the sentence must end the school name with a period before "I'm mostly into"
  assert.match(intro, /\.\{" "\}I&apos;m mostly into/, "period missing after UC San Diego");
  // Oxford comma before the final "and design"
  assert.match(
    intro,
    /,\{" "\}\s*and/,
    "comma missing before 'and design'"
  );
});

test("interactive words are semantic buttons", () => {
  const intro = read("components/Intro.tsx");
  for (const word of ["ucsd", "inference", "basketball", "markets", "design"]) {
    assert.equal(
      intro.includes(`trigger("${word}")`),
      true,
      `interactive word missing: ${word}`
    );
  }
  assert.match(intro, /<button/g);
  assert.equal(intro.includes("type=\"button\""), true);
});

test("only verified project links are present", () => {
  for (const href of [
    "https://github.com/skcache/miniserve",
    "https://github.com/skcache/cacheyard",
    "https://github.com/skcache/plywise",
    "https://github.com/skcache/jevtrafficsim",
    "https://orviaops.com",
    "https://jevtrafficsim.vercel.app",
    "https://plywise-chess.vercel.app",
    "https://github.com/skcache",
    "https://x.com/skcache",
  ]) {
    assert.equal(source.includes(href), true, `verified href missing: ${href}`);
  }
});

test("no fabricated links: private repo never linked, no invented URLs", () => {
  assert.equal(
    source.includes("github.com/skcache/orvia"),
    false,
    "Orvia repo is private; must not link to GitHub"
  );
  const urls = [...source.matchAll(/https:\/\/[a-z0-9./-]+/gi)].map((m) =>
    m[0].replace(/[)'"]/g, "")
  );
  const allowed = [
    "https://github.com/skcache/miniserve",
    "https://github.com/skcache/cacheyard",
    "https://github.com/skcache/plywise",
    "https://github.com/skcache/jevtrafficsim",
    "https://orviaops.com",
    "https://jevtrafficsim.vercel.app",
    "https://plywise-chess.vercel.app",
    "https://github.com/skcache",
    "https://x.com/skcache",
  ];
  const unexpected = urls.filter((u) => !allowed.includes(u));
  assert.equal(unexpected.length, 0, `unexpected URL(s): ${unexpected.join(", ")}`);
});

test("experience list only contains the supplied facts", () => {
  for (const line of [
    "President, GDG UC San Diego",
    "Undergraduate research, Chiba Lab, UC San Diego",
    "Keywords Studios",
    "Oracle REACH",
    "Palantir Winter Tech Fellowship",
  ]) {
    assert.equal(source.includes(line), true, `experience entry missing: ${line}`);
  }
});