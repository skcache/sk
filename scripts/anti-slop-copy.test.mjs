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
  // markets and design are plain text now, with the Oxford comma intact
  assert.equal(text.includes(", markets, and design"), true, "comma or plain-text list lost");
});

test("interaction architecture: three objects, no generic API", () => {
  const intro = read("components/Intro.tsx");
  for (const tag of ["<UCSDWord", "<InferenceWord", "<BasketballWord"]) {
    assert.equal(intro.includes(tag), true, `missing object: ${tag}`);
  }
  // markets / design / systems must NOT have their own interaction objects
  for (const tag of ["<MarketsWord", "<DesignWord", "<SystemsWord"]) {
    assert.equal(intro.includes(tag), false, `stray object present: ${tag}`);
  }
  // old generic API is gone
  const all = files.map(read).join("\n");
  assert.equal(all.includes("trigger("), false, "old trigger() API must be gone");
});

test("interactive words are semantic buttons via TactileWord", () => {
  const tactile = read("components/TactileWord.tsx");
  assert.match(tactile, /<motion\.button/);
  assert.equal(tactile.includes("type=\"button\""), true);
  assert.equal(tactile.includes("aria-label={label}"), true);
  for (const f of ["InferenceWord.tsx", "UCSDWord.tsx", "BasketballWord.tsx"]) {
    const src = read(`components/${f}`);
    assert.equal(src.includes("<TactileWord"), true, `${f} must use TactileWord`);
  }
});

test("no stale effect CSS or old keyframes remain", () => {
  const css = read("globals.css");
  for (const stale of [
    "ucsd-flash",
    "trident-pop",
    "shimmer",
    "ball-hop",
    "sparkline",
    "box-pop",
    "word-design",
    "word-fallback",
    "word-ucsd-anim",
  ]) {
    assert.equal(css.includes(stale), false, `stale CSS present: ${stale}`);
  }
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
    "https://www.linkedin.com/in/skuwar",
    "https://skx.si",
  ];
  const unexpected = urls.filter((u) => !allowed.includes(u));
  assert.equal(unexpected.length, 0, `unexpected URL(s): ${unexpected.join(", ")}`);
});

test("experience list only contains the supplied facts", () => {
  for (const line of [
    "building Orvia",
    "President,",
    'label="GDG"',
    "at UC San Diego",
    "Undergraduate research, Chiba/HECD Lab, UC San Diego",
    "AI Research Intern @",
    "Keywords Studios",
  ]) {
    assert.equal(source.includes(line), true, `experience entry missing: ${line}`);
  }
  for (const gone of ["Oracle REACH", "Palantir", "Google Developer Groups (GDG)"]) {
    assert.equal(source.includes(gone), false, `entry should be gone: ${gone}`);
  }
});

test("easter egg brand colors are pinned", () => {
  for (const color of [
    "#4285F4", // Google blue, red, yellow, green
    "#EA4335",
    "#FBBC05",
    "#34A853",
    "#0042ff", // Keywords Studios brand blue (their stylesheet)
  ]) {
    assert.equal(
      source.includes(color),
      true,
      `brand color missing: ${color}`
    );
  }
});

test("dark mode is committed: no light theme, no scheme switching", () => {
  const css = read("globals.css");
  for (const stray of ["#f7f5ef", "#26221c", "#faf9f6", "color-scheme: light"]) {
    assert.equal(css.includes(stray), false, `light theme leftover: ${stray}`);
  }
  assert.equal(css.includes("#0d0f12"), true, "dark background token missing");
  assert.equal(css.includes("#f3f1ea"), true, "light text token missing");
});

test("polish pass: reveal, grain, plaque, affordance, autoplay", () => {
  const css = read("globals.css");
  // blur-resolve entrance is JS-gated (no-JS keeps content visible)
  assert.equal(css.includes("reveal-in"), true, "reveal keyframes missing");
  assert.equal(css.includes("[data-reveal]"), true, "data-reveal rule missing");
  assert.equal(css.includes(".js [data-reveal]"), true, "reveal not JS-gated");
  // grain is SVG feTurbulence fixed overlay
  assert.equal(css.includes("feTurbulence"), true, "grain turbulence missing");
  assert.equal(css.includes("pointer-events: none"), true, "overlay must not block clicks");
  // plaque contrast + gold hairline
  assert.equal(css.includes("#22385e"), true, "plaque contrast lift missing");
  assert.equal(css.includes("rgba(201, 162, 39, 0.2)"), true, "plaque gold border missing");
  // affordance: rest 28%, hover/focus 72%
  assert.equal(css.includes("rgba(243, 241, 234, 0.28)"), true, "rest affordance alpha wrong");
  assert.equal(css.includes("rgba(243, 241, 234, 0.72)"), true, "hover affordance alpha wrong");
  // autoplay tour drives the real tactile buttons, never GDG/Keywords
  const autoplay = read("components/IntroAutoplay.tsx");
  assert.equal(autoplay.includes('press("UC San Diego")'), true);
  assert.equal(autoplay.includes('press("inference")'), true);
  assert.equal(autoplay.includes('press("basketball")'), true);
  assert.equal(autoplay.includes('press("GDG")'), false, "autoplay must not press GDG");
  // one-shot, no loop
  assert.equal(autoplay.includes("setInterval"), false, "no looping autoplay");
  // five reveal slots on the page
  const page = read("page.tsx");
  assert.equal((page.match(/data-reveal/g) || []).length, 5, "expected 5 reveal slots");
});