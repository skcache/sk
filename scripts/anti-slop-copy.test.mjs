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
    "Hey, I'm Siddhant. I'm a 4th year CS student at",
    "UC San Diego",
    "I'm mostly into",
    "inference",
    ", systems, and building software. Outside of that,",
    "basketball",
    "markets",
    "music",
  ]) {
    assert.equal(text.includes(line), true, `intro copy missing: ${line}`);
  }
  assert.equal(intro.includes("design"), false, "design is gone from the intro");
  // the sentence must end the school name with a period before "I'm mostly into"
  assert.match(intro, /\.\{" "\}I&apos;m mostly into/, "period missing after UC San Diego");
  // markets stays plain text, music gained an interaction; Oxford comma intact
  assert.equal(text.includes(", markets, and"), true, "Oxford comma lost");
});

test("interaction architecture: three objects, no generic API", () => {
  const intro = read("components/Intro.tsx");
  for (const tag of ["<UCSDWord", "<InferenceWord", "<BasketballWord"]) {
    assert.equal(intro.includes(tag), true, `missing object: ${tag}`);
  }
  // markets / systems must NOT have their own interaction objects
  for (const tag of ["<MarketsWord", "<DesignWord", "<SystemsWord"]) {
    assert.equal(intro.includes(tag), false, `stray object present: ${tag}`);
  }
  // V2: music opens the shared stage; the stage is wired via provider
  assert.equal(intro.includes("<MusicWord"), true, "music word missing");
  const stage = read("components/InteractionStage.tsx");
  assert.equal(stage.includes("AnimatePresence"), true, "stage needs AnimatePresence");
  assert.equal(stage.includes('mode="wait"'), true, "stage must swap with mode=wait");
  assert.equal(stage.includes("music"), true, "stage must accept the music action");
  const provider = read("components/StageProvider.tsx");
  assert.equal(provider.includes("InteractionStage"), true, "provider must render the stage");
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
    // vendored component provenance (Cult UI DynamicIsland MIT source)
    "https://www.cult-ui.com/docs/components/dynamic-island",
  ];
  const unexpected = urls.filter((u) => !allowed.includes(u));
  assert.equal(unexpected.length, 0, `unexpected URL(s): ${unexpected.join(", ")}`);
});

test("experience list only contains the supplied facts", () => {
  for (const line of [
    "Building",
    'label="Orvia"',
    "President at",
    'label="Google Dev Group"',
    ", UC San Diego",
    "Undergraduate Research Assistant at Chiba Lab",
    "AI Research Intern at",
    'label="Keywords Studios"',
  ]) {
    assert.equal(source.includes(line), true, `experience entry missing: ${line}`);
  }
  for (const gone of [
    "Oracle REACH",
    "Palantir",
    "Google Developer Groups (GDG)",
    "Undergraduate research, Chiba/HECD Lab, UC San Diego",
    "CV undergrad RA",
    "HECD",
    "President,",
    'label="GDG"',
  ]) {
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
  // UCSD local identity: gold rule + trident, no plaque box
  assert.equal(css.includes("#c9a227"), true, "UCSD gold identity missing");
  assert.equal(css.includes(".badge-rule"), true, "gold rule missing");
  assert.equal(css.includes(".badge-trident-wrap"), true, "trident mark missing");
  assert.equal(css.includes(".identity-slot"), true, "experience identity slots missing");
  // affordance: hover contrast only (dotted underlines removed in repair pass)
  assert.equal(css.includes(".word-button:hover"), true, "hover affordance missing");
  assert.equal(css.includes("transition: color 150ms ease"), true, "hover brighten must fade smoothly");
  // V1/V2 boundary: inference NEVER autoplays - no IntroAutoplay file,
  // no render, nothing presses anything on load
  const page = read("page.tsx");
  assert.equal(page.includes("IntroAutoplay"), false, "autoplay render must be gone");
  assert.equal(source.includes("IntroAutoplay"), false, "IntroAutoplay component must be deleted");
  // five reveal slots on the page
  assert.equal((page.match(/data-reveal/g) || []).length, 5, "expected 5 reveal slots");
});

test("mechanical press pass: no box, no squash, no hint, no stale systems", () => {
  const css = read("globals.css");
  // rigid-object press: uniform scale only, no per-axis glyph squash
  assert.equal(css.includes("scaleY: 0.96"), false, "rubbery squash must be gone");
  assert.equal(css.includes("transform-origin: 50% 100%"), true, "rigid origin missing");
  // keycap plates are GONE: at rest the words are plain typography
  assert.equal(css.includes(".word-signature"), false, "keycap plate must be gone");
  assert.equal(css.includes("background: none"), true, "buttons carry no fill at rest");
  assert.equal(css.includes(".word-button.is-pressed"), true, "contrast press state missing");
  assert.equal(css.includes("color: #ffffff"), true, "press brightens the word (contrast only)");
  // FirstLoadHint system fully removed
  const all = source;
  assert.equal(all.includes("FirstLoadHint"), false, "FirstLoadHint must be gone");
  assert.equal(all.includes("hint-draw"), false, "hint-draw CSS must be gone");
  assert.equal(all.includes("first-hint"), false, ".first-hint must be gone");
  assert.equal(all.includes("scaleY: 0.96"), false, "no scaleY:0.96 anywhere");
  // stale systems deleted
  for (const stale of [
    "word-chassis",
    "word-stage",
    "word-segs",
    "word-result",
    "badge-plaque",
    "google-accent",
    "keywords-chip",
    "badge-assembly",
  ]) {
    assert.equal(all.includes(stale), false, `stale system present: ${stale}`);
  }
  // UCSD: single parent window, no child-owned unmount, local identity
  const ucsd = read("components/UCSDWord.tsx");
  assert.equal(ucsd.includes("onAnimationComplete"), false, "no child unmounts the badge");
  assert.equal(ucsd.includes("badge-plaque"), false, "the plaque box is gone");
  // shared identity language: plain letter at rest, live mark box opens
  for (const cls of ["o-letter", "k-letter", "o-markbox", "gdg-markbox", ".k-markbox", ".o-mark", ".gdg-mark"]) {
    assert.equal(css.includes(cls), true, `identity class missing: ${cls}`);
  }
  for (const gone of ["o-slot", "gdg-slot", "k-slot"]) {
    assert.equal(css.includes(gone), false, `empty reserved slot must be gone: ${gone}`);
  }
  assert.equal(all.includes(".gdg-box"), false, "gdg width animation must be gone");
  assert.equal(all.includes("orvia-mark-o"), false, "hand-drawn circles must be gone");
  // Orvia: the exact canonical asset from skcache/orvia/public/logo.svg
  assert.equal(all.includes("public/orvia-logo.svg"), true, "canonical orvia asset missing");
  const orvia = read("components/OrviaWord.tsx");
  assert.equal(orvia.includes("<circle"), false, "no circle approximations");
  assert.equal(orvia.includes('x="14"'), true, "canonical O-ring geometry missing");
  // inference: thinking-orbs signature interaction - 5s work, random state
  const inf = read("components/InferenceWord.tsx");
  assert.equal(inf.includes("ThinkingOrb"), true, "thinking orb missing");
  assert.equal(inf.includes("state=\"solving\""), true, "solving state missing");
  assert.equal(inf.includes("size={20}"), true, "20px inline orb missing");
  assert.equal(inf.includes("word-morph"), true, "fixed morph slot missing");
  assert.equal(inf.includes("THINK_MS = 5000"), true, "5s inference hold missing");
  assert.equal(inf.includes("INFER_ORB_STATES"), true, "randomized orb states missing");
  assert.equal(inf.includes("thinking</span>"), true, "active word is lowercase thinking");
  assert.equal(inf.includes(">Thinking<"), false, "capitalized Thinking must be gone");
  assert.equal(inf.includes('.split("'), false, "per-letter split must be gone");
  assert.equal(inf.includes('thinkin"'), false, "misspelled thinkin token must be gone");
  assert.equal(inf.includes("word-morph-char"), false, "per-char spans must be gone");
  // experience identities use the canonical public assets
  for (const asset of ["gdg-mark.svg", "kw-mark.svg"]) {
    assert.equal(all.includes(asset), true, `canonical asset missing: ${asset}`);
  }
  // basketball: long settle hold kept
  const bb = read("components/BasketballWord.tsx");
  assert.equal(bb.includes("0.87"), true, "ball hold segment missing");
});

test("v2 repair: cohesive thinking, real island primitives, quiet stage", () => {
  const kit = read("components/kit/dynamic-island.tsx");
  for (const p of [
    "DynamicIslandProvider",
    "DynamicIsland",
    "DynamicContainer",
    "DynamicTitle",
    "DynamicDescription",
    "useDynamicIslandSize",
    "scheduleAnimation",
  ]) {
    assert.equal(kit.includes(p), true, `kit primitive missing: ${p}`);
  }
  const music = read("components/MusicIsland.tsx");
  assert.equal(music.includes("setTimeout"), false, "island must not hand-roll its own timer chain");
  assert.equal(music.includes("scheduleAnimation"), true, "island must use the cult UI animation queue");
  assert.equal(music.includes("morph"), true, "island must drive one continuous morph");
  assert.equal(music.includes("MUSIC_ORB_STATES"), true, "island must randomize its orb state");
  assert.equal(music.includes("ThinkingOrb"), true, "island must carry a living orb");
  const stageCode = read("components/InteractionStage.tsx");
  assert.equal(stageCode.includes("active ? 88 : 44"), false, "stage must not expand in space");
  assert.equal(stageCode.includes("AnimatePresence"), true, "stage must keep the swap machinery");
  assert.equal(stageCode.includes("44px"), true, "stage must keep a fixed quiet slot");
  const css = read("globals.css");
  assert.equal(css.includes(".dynamic-island"), true, "island shell CSS missing");
  assert.equal(css.includes("backdrop-filter"), true, "liquid glass blur missing");
  assert.equal(css.includes(".dynamic-island-eq"), true, "equalizer bars CSS missing");
  assert.equal(css.includes(".dynamic-island-progress"), true, "progress bar CSS missing");
  assert.equal(css.includes(".dynamic-island-title"), true, "island typography CSS missing");
  assert.equal(css.includes("underline dotted"), false, "dotted underline affordance must be gone");
  for (const stale of [".island-art", ".island-meta", ".island-title", ".island-artist", "word-notch", "word-morph-resolve", "dynamic-island-dot", ".dynamic-island-content", ".dynamic-island-container"]) {
    assert.equal(source.includes(stale), false, `stale class present: ${stale}`);
  }
  const fav = read("config/favorite-song.ts");
  assert.equal(fav.includes("Kick"), true, "favorite song missing");
  assert.equal(fav.includes("Future"), true, "favorite artist missing");
});