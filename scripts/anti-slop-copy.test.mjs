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
    "Undergraduate Research Assistant at",
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
  assert.equal(css.includes("[data-reveal]"), false, "CSS keyframe reveal must be gone (GSAP owns it)");
  const pv = read("components/PageReveal.tsx");
  assert.equal(pv.includes("gsap.timeline"), true, "GSAP timeline missing");
  assert.equal(pv.includes("i * 0.3"), true, "perceptible 300ms stagger missing");
  // grain is SVG feTurbulence fixed overlay
  assert.equal(css.includes("feTurbulence"), true, "grain turbulence missing");
  assert.equal(css.includes("pointer-events: none"), true, "overlay must not block clicks");
  // UCSD final: click-only phrase-level sweep, WAAPI-owned, no per-glyph work
  assert.equal((css.match(/uc san diego: the click-only double pass/g) || []).length, 1, "the UCSD CSS block must exist exactly once (no duplicate)");
  assert.equal(css.includes(".ucsd-glyph"), false, "per-glyph layers must be gone");
  assert.equal(css.includes(".ucsd-base"), true, "ink base span missing");
  assert.equal(css.includes(".ucsd-navy"), true, "phrase navy overlay missing");
  assert.equal(css.includes(".ucsd-gold"), true, "phrase gold overlay missing");
  assert.equal(css.includes("ucsd-gap"), false, "the per-word gap must be gone");
  assert.equal(css.includes("opacity: 0"), true, "overlays must be invisible at rest (invisible reset)");
  assert.equal(css.includes("transition: clip-path"), false, "clip transitions must be gone (WAAPI owns the paint)");
  assert.equal(css.includes("transition: none"), true, "the clip must never transition - no reverse wipe");
  assert.equal(css.includes("ucsd-navy-rise"), false, "the CSS paint keyframes must be gone (WAAPI owns timing)");
  assert.equal(css.includes("ucsd-gold-rise"), false, "the CSS paint keyframes must be gone (WAAPI owns timing)");
  assert.equal(css.includes("--ucsd-run-ms"), false, "the run-duration variable must be gone (one TIMING contract)");
  assert.equal(css.includes("pass-navy"), false, "the old pass state classes must be gone");
  assert.equal(css.includes("pass-gold"), false, "the old pass state classes must be gone");
  assert.equal(css.includes("pass-melt"), false, "the old pass state classes must be gone");
  assert.equal(css.includes(".ucsd-staff"), false, "SVG <g> clipping must be gone");
  assert.equal(css.includes(".ucsd-head"), false, "SVG <g> clipping must be gone");
  assert.equal(css.includes(".trident-staff-layer"), true, "the staff HTML layer missing");
  assert.equal(css.includes(".trident-head-layer"), true, "the head HTML layer missing");
  assert.equal(css.includes("ucsd-head-part1"), false, "the faceted trident parts must be gone");
  assert.equal(css.includes("build-staff"), false, "the build-class hooks must be gone");
  assert.equal(css.includes("build-head"), false, "the build-class hooks must be gone");
  assert.equal(css.includes(".ucsd-trident-fly"), true, "viewport trident flight missing");
  assert.equal(css.includes("ucsd-seg-fade"), false, "old fade-out animation must be gone");
  assert.equal(css.includes(".stage-ucsd"), false, "stage trident must be gone");
  assert.equal(css.includes(".ucsd-pop"), false, "word pop must be gone");
  assert.equal(css.includes(".identity-slot"), true, "experience identity slots missing");
  const gdg = read("components/GoogleDevGroupWord.tsx");
  assert.equal(gdg.includes("PALETTE"), true, "uniform four-color sweep missing");
  assert.equal(gdg.includes('PALETTE[i % PALETTE.length]'), true, "continuous palette sequence missing");
  assert.equal(gdg.includes("return \"#4285F4\""), false, "Dev Group must not fall flat to solid blue");
  // affordance: hover contrast only (dotted underlines removed in repair pass)
  assert.equal(css.includes(".word-button:hover"), true, "hover affordance missing");
  assert.equal(css.includes(".word-button::after"), false, "underline affordance must be gone");
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
  // UCSD: click-only phrase-level sweep + one WAAPI timing contract
  const ucsd = read("components/UCSDWord.tsx");
  assert.equal(ucsd.includes("TridentMark"), true, "trident asset missing");
  assert.equal(ucsd.includes("UCSD_TIMING"), true, "the one timing contract missing");
  assert.equal(ucsd.includes("navyEnd: 340"), true, "navy window must end at 340ms");
  assert.equal(ucsd.includes("goldStart: 250"), true, "gold chase must begin at 250ms");
  assert.equal(ucsd.includes("goldEnd: 640"), true, "gold window must end at 640ms");
  assert.equal(ucsd.includes("settleEnd: 800"), true, "the settle beat must be 800ms");
  assert.equal(ucsd.includes("hold: 90"), true, "the completion beat must be 90ms");
  assert.equal(ucsd.includes("ACTUATION_MS"), true, "the post-release actuation beat missing");
  assert.equal(ucsd.includes("RAISE_CLEARANCE"), true, "the mobile paragraph-clearance raise missing");
  assert.equal(ucsd.includes("cubic-bezier(0.22, 1, 0.36, 1)"), true, "the quick responsive rise ease missing");
  assert.equal(ucsd.includes("maskSize"), true, "the soft mask feather reveal missing");
  assert.equal(ucsd.includes("WebkitMaskSize"), true, "the webkit mask feather missing");
  assert.equal(ucsd.includes("textShadow"), true, "the sweep glow must ride the WAAPI reveal");
  assert.equal(ucsd.includes("drop-shadow"), true, "the trident completion shimmer missing");
  assert.equal(ucsd.includes("brightness(1.25)"), true, "the completion glow must visibly pulse");
  assert.equal(ucsd.includes("T.total + T.hold"), true, "the throw must wait for the full ink settle + beat");
  assert.equal(ucsd.includes("rotate("), true, "the throw rotation missing");
  assert.equal(ucsd.includes("const t = timers.current"), false, "cleanup must read the CURRENT refs (no stale array capture)");
  // the phrase-level stack: ONE base + TWO absolute overlays, no per-glyph work
  assert.equal(ucsd.includes("LETTERS"), false, "the per-character split must be gone");
  assert.equal(ucsd.includes('"UC San Diego".split("")'), false, "per-glyph spans must be gone");
  assert.equal(ucsd.includes("ucsd-base"), true, "the ink base span missing");
  assert.equal(ucsd.includes("ucsd-navy"), true, "the phrase navy overlay missing");
  assert.equal(ucsd.includes("ucsd-gold"), true, "the phrase gold overlay missing");
  // no page-load animation of any kind - click only
  assert.equal(ucsd.includes("WIPE_DELAY"), false, "the load delay must be gone");
  assert.equal(ucsd.includes("LOAD_MS"), false, "the load tempo must be gone");
  assert.equal(ucsd.includes("play(false"), false, "the load paint branch must be gone");
  // one WAAPI timeline + one deterministic flight - no physics loops
  assert.equal(ucsd.includes("requestAnimationFrame"), false, "the rAF flight loop must be gone");
  assert.equal(ucsd.includes("performance.now"), false, "manual physics clock must be gone");
  assert.equal(ucsd.includes("translate3d"), true, "the flight must use translate3d");
  assert.equal(ucsd.includes("onfinish"), true, "the flight must finish to a clean state");
  assert.equal(ucsd.includes("Math.min(750, Math.max(420"), true, "distance-clamped flight duration missing");
  assert.equal(ucsd.includes("MARK_W / 2"), true, "spawn must be centered by the mark width");
  assert.equal(ucsd.includes("MARK_H - 6"), true, "spawn must sit above the phrase by the mark height");
  assert.equal(ucsd.includes('"idle" | "building" | "flying"'), true, "the 3-state machine missing");
  assert.equal(ucsd.includes("ucsd-trident-fly"), true, "trident flight wrapper missing");
  assert.equal(ucsd.includes("pass-navy"), false, "the old pass classes must be gone");
  assert.equal(ucsd.includes("pass-gold"), false, "the old pass classes must be gone");
  assert.equal(ucsd.includes("pass-melt"), false, "the old pass classes must be gone");
  assert.equal(ucsd.includes("FORM_MS"), false, "the internal formation timer must be gone");
  assert.equal(ucsd.includes("HOVER_MS"), false, "the hover timer must be gone");
  assert.equal(ucsd.includes("useStage"), false, "ucsd must NOT use the shared stage anymore");
  const trident = read("components/TridentMark.tsx");
  const goldFills = (trident.match(/fill=\{GOLD\}/g) || []).length;
  assert.equal(goldFills >= 4, true, "every trident path must be solid gold");
  assert.equal(/N_LIGHT|N_MID|N_SHADOW|G_LIGHT|G_MID|G_SHADOW/.test(trident), false, "the low-poly facet palettes must be gone");
  assert.equal(trident.includes("#182B49"), false, "the trident must have NO navy/blue fill");
  const paths = (trident.match(/<path/g) || []).length;
  assert.equal(paths <= 5, true, `the minimal trident must be 3-5 paths max (has ${paths})`);
  assert.equal(trident.includes("trident-staff-layer"), true, "the staff HTML layer missing");
  assert.equal(trident.includes("trident-head-layer"), true, "the head HTML layer missing");
  assert.equal(trident.includes('className="ucsd-staff"'), false, "SVG <g> clipping must be gone");
  assert.equal(trident.includes('className="ucsd-head"'), false, "SVG <g> clipping must be gone");
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
  assert.equal(inf.includes("ThinkingOrb"), true, "libraries.dev thinking orbs required");
  assert.equal(inf.includes("paused={!!reduceMotion}"), true, "reduced-motion pause missing");
  assert.equal(inf.includes("state={orbState}"), true, "live orb must use the randomized state");
  assert.equal(inf.includes('size={32}'), true, "orb renders sharp at package size");
  assert.equal(inf.includes("orb-24"), true, "24px orb display wrapper missing");
  assert.equal(inf.includes("word-morph"), true, "fixed morph slot missing");
  assert.equal(inf.includes("THINK_MS = 2500"), true, "2.5s inference hold missing");
  assert.equal(inf.includes("INFER_ORB_STATES"), true, "random orb states must exist");
  assert.equal(inf.includes("pickOrbState"), true, "per-run random orb selection missing");
  assert.equal(inf.includes("state={orbState}"), true, "live orb must use the randomized state");
  assert.equal(inf.includes("thinking</span>"), true, "active word is lowercase thinking");
  assert.equal(inf.includes("thinking-word"), true, "native per-letter wave missing");
  assert.equal(inf.includes("tw-wave"), false, "overlay glow must be gone (native wave only)");
  assert.equal(inf.includes('data-text="thinking"'), false, "glow overlay attr must be gone");
  assert.equal(inf.includes("if (phase === \"thinking\") return"), true, "activations must be ignored while thinking");
  assert.equal(inf.includes(".split(\"\""), true, "per-letter wave needs the split");
  assert.equal(inf.includes('thinkin"'), false, "misspelled thinkin token must be gone");
  assert.equal(inf.includes("word-morph-char"), false, "per-char spans must be gone");
  // experience identities use the canonical public assets
  for (const asset of ["gdg-mark.svg", "kw-mark.svg"]) {
    assert.equal(all.includes(asset), true, `canonical asset missing: ${asset}`);
  }
  // basketball: the word is ONLY the trigger; the ball lives in the stage
  const bb = read("components/BasketballWord.tsx");
  assert.equal(bb.includes("useStage"), true, "basketball must open the stage");
  assert.equal(bb.includes("word-ball"), false, "inline word ball must be gone");
  const bbStage = read("components/BasketballStage.tsx");
  assert.equal(bbStage.includes("DUR = 2450"), true, "slow readable crossing missing");
  assert.equal(bbStage.includes("wordX"), true, "ball must spawn at the word");
  assert.equal(bbStage.includes("DROP_IN"), true, "drop-in above the stage missing");
  assert.equal(bbStage.includes("RESTITUTION"), true, "true restitution physics missing");
  assert.equal(bbStage.includes("GRAVITY"), true, "time-integrated gravity missing");
  assert.equal(bbStage.includes("bb-shadow"), true, "contact shadow missing");
  assert.equal(bbStage.includes("PixelBall"), true, "8-bit pixel sprite missing");
  assert.equal(bbStage.includes("crispEdges"), true, "pixel sprite must stay hard-edged");
  assert.equal(bbStage.includes("SPINS"), false, "pixel sprites must not rotate");
  // chiba lab: the one-time letter cascade mini easter egg - NOT the
  // inference glow sweep
  const chiba = read("components/ChibaWord.tsx");
  assert.equal(chiba.includes("TactileWord"), true, "chiba must keep the tactile click");
  assert.equal(chiba.includes("chiba-letter"), true, "letter cascade missing");
  assert.equal(chiba.includes("chiba-sweep"), false, "chiba must NOT reuse the inference sweep");
  assert.equal(chiba.includes("animationDelay"), true, "cascade stagger missing");
  assert.equal(chiba.includes("onAnimationEnd"), true, "cascade must clear after one pass");
  assert.equal(chiba.includes("animationName"), true, "cascade must filter its own animationend");
  assert.equal(css.includes("chiba-letter-pop"), true, "cascade keyframes missing");
  assert.equal(css.includes("chiba-sweep-once"), false, "old sweep keyframes must be gone");
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
  assert.equal(music.includes("buildFrames"), false, "island must not hand-roll a frame table");
  assert.equal(music.includes("requestAnimationFrame"), false, "island must not hand-roll rAF");
  assert.equal(music.includes("useScheduledAnimations"), true, "island must use the official animation queue");
  assert.equal(music.includes("~3 seconds"), true, "3s lifecycle missing");
  assert.equal(music.includes("delay: 2650"), true, "contract schedule missing");
  assert.equal(music.includes("DynamicIslandProvider"), true, "island must use the official provider");
  assert.equal(music.includes("SIZE_PRESETS.COMPACT_LONG"), true, "island must use the official preset");
  assert.equal(music.includes("layoutId"), true, "island must share layout with the word");
  assert.equal(music.includes("ThinkingOrb"), false, "music must have zero ThinkingOrb");
  assert.equal(music.includes("buildFrames"), false, "frame table must be gone");
  assert.equal(music.includes("requestAnimationFrame"), false, "rAF engine must be gone");
  assert.equal(music.includes("MUSIC_ORB_STATES"), false, "music orb states must be gone");
  assert.equal(music.includes("STEP_MS"), false, "frame stepping must be gone");
  const musicWord = read("components/MusicWord.tsx");
  assert.equal(musicWord.includes('layoutId="music-island"'), true, "word seed missing");
  const stageCode = read("components/InteractionStage.tsx");
  assert.equal(stageCode.includes("AnimatePresence"), true, "stage must keep the swap machinery");
  assert.equal(stageCode.includes('mode="wait"'), true, "stage must swap with mode=wait");
  assert.equal(stageCode.includes('"basketball"'), true, "stage must host basketball");
  assert.equal(stageCode.includes('"ucsd"'), false, "stage must NOT host ucsd (trident flies off the viewport)");
  const css = read("globals.css");
  assert.equal(css.includes(".interaction-stage"), true, "stage CSS missing");
  assert.equal(css.includes("height: 26px"), true, "stage resting state missing");
  assert.equal(css.includes(".interaction-stage.is-active"), true, "stage active expansion missing");
  assert.equal(css.includes("height: 72px"), true, "mobile stage height missing");
  assert.equal(css.includes("height: 88px"), true, "desktop stage height missing");
  assert.equal(css.includes(".dynamic-island-row"), true, "island row CSS missing");
  assert.equal(css.includes(".dynamic-island-shell"), true, "island shell CSS missing");
  assert.equal(css.includes(".dynamic-island-eq"), true, "equalizer bars CSS missing");
  assert.equal(css.includes(".dynamic-island-title"), true, "island typography CSS missing");
  assert.equal(css.includes("underline dotted"), false, "dotted underline affordance must be gone");
  for (const stale of ["word-ball", "badge-rule", "badge-trident-wrap", "badge-type", "badge-identity", "dynamic-island-progress", "word-notch", "word-morph-resolve", "dynamic-island-dot", ".dynamic-island-content", ".dynamic-island-container", "buildFrames", "STEP_MS", "MUSIC_ORB_STATES"]) {
    assert.equal(source.includes(stale), false, `stale class present: ${stale}`);
  }
  const fav = read("config/favorite-song.ts");
  assert.equal(fav.includes("Kick"), true, "favorite song missing");
  assert.equal(fav.includes("Future"), true, "favorite artist missing");
});