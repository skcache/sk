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
  const css = read("globals.css");
  assert.match(tactile, /<motion\.button/);
  assert.equal(tactile.includes('type="button"'), true);
  // the ONE-TIME discovery glint is global through TactileWord:
  // every current AND future word inherits it - never per-component
  assert.equal(tactile.includes("IntersectionObserver"), true, "the glint observer missing");
  assert.equal(tactile.includes("PROX_RADIUS = 120"), true, "the proximity radius (120px) missing");
  assert.equal(tactile.includes("PROX_PULL_MAX = 2"), true, "the max 2px magnetic pull missing");
  assert.equal(tactile.includes("PROX_GLOW_MAX = 0.07"), true, "the subtle proximity glow missing");
  assert.equal(tactile.includes("word-proximity"), true, "the proximity wrapper missing");
  assert.equal(tactile.includes('e.pointerType !== "mouse"'), true, "the fine-pointer-only gate missing");
  assert.equal(tactile.includes('"(pointer: fine)"'), true, "the coarse-pointer guard missing");
  assert.equal(tactile.includes("useSpring"), true, "the springed proximity missing");
  assert.equal(css.includes(".word-proximity"), true, "the proximity wrapper CSS missing");
  assert.equal(css.includes("display: inline-block"), true, "the no-layout-shift inline-block wrapper missing");
  assert.equal(tactile.includes('dataset.shimmered'), true, "the one-time glint guard missing");
  assert.equal(tactile.includes("i * 100"), true, "the ~100ms stagger missing");
  assert.equal(tactile.includes("reduceMotion"), true, "the reduced-motion gate missing");
  assert.equal(tactile.includes("interactive-shimmer-ready"), true, "the reveal-ready gate missing");
  assert.equal(tactile.includes("pendingShimmers"), true, "the pre-reveal pending queue missing");
  assert.equal(css.includes("@keyframes word-glint"), true, "the word-glint sweep keyframes missing");
  assert.equal(css.includes(".word-button.is-shimmering::before"), true, "the glint overlay missing");
  assert.equal(css.includes("word-shimmer"), false, "the old whole-word brightness pulse must be gone");
  assert.equal(css.includes("filter: brightness"), false, "no whole-word brightness filter anywhere");
  assert.equal(tactile.includes("is-pressed"), true);
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
  // UCSD final: click-only whole-phrase sweep - ONE clip + ONE glow per overlay
  assert.equal((css.match(/uc san diego: the click-only double pass/g) || []).length, 1, "the UCSD CSS block must exist exactly once (no duplicate)");
  assert.equal(css.includes(".ucsd-glyph"), false, "per-glyph layers must be gone");
  assert.equal(css.includes(".ucsd-base"), true, "ink base span missing");
  assert.equal(css.includes(".ucsd-navy"), true, "phrase navy overlay missing");
  assert.equal(css.includes(".ucsd-gold"), true, "phrase gold overlay missing");
  assert.equal(css.includes("color: #182B49"), true, "the official navy paint missing");
  assert.equal(css.includes("color: #C69214"), true, "the official gold paint missing");
  assert.equal(css.includes("#5C87C6"), false, "the brightened navy wash must be gone");
  assert.equal(css.includes("#E3B23C"), false, "the brightened gold wash must be gone");
  assert.equal(css.includes(".ucsd-navy-crest"), false, "the crest layers must be gone");
  assert.equal(css.includes(".ucsd-gold-crest"), false, "the crest layers must be gone");
  assert.equal(css.includes(".ucsd-pl"), false, "the per-letter paint spans must be gone");
  assert.equal(css.includes(".ucsd-cl"), false, "the per-letter crest spans must be gone");
  assert.equal(css.includes("mask-size"), false, "any animated mask-size must be gone - the light-front mask is static");
  assert.equal(css.includes("mask-image"), true, "the static light-front band mask missing");
  assert.equal(css.includes("white-space: pre"), false, "the per-letter layout hack must be gone");
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
  // UCSD: click-only whole-phrase sweep + one WAAPI timing contract
  const ucsd = read("components/UCSDWord.tsx");
  assert.equal(ucsd.includes("TridentMark"), true, "trident asset missing");
  assert.equal(ucsd.includes("UCSD_TIMING"), true, "the one timing contract missing");
  assert.equal(ucsd.includes("total: 900"), true, "the phrase must be ink by 900ms");
  assert.equal(ucsd.includes("navyEnd: 420"), true, "navy front must end at 420ms");
  assert.equal(ucsd.includes("goldStart: 290"), true, "gold chase must begin at 290ms");
  assert.equal(ucsd.includes("goldEnd: 750"), true, "gold front must end at 750ms");
  assert.equal(ucsd.includes("settleEnd: 750"), true, "the settle must begin at 750ms");
  assert.equal(ucsd.includes("hold: 90"), true, "the completion beat must be 90ms");
  // PAINT fronts: ONE linear two-keyframe reveal each - constant velocity
  assert.equal(ucsd.includes("easing: \"linear\""), true, "the paint reveal must be linear");
  assert.equal(ucsd.includes("cubic-bezier(0.45, 0, 0.55, 1)"), false, "the eased reveal must be gone - linear fronts only");
  assert.equal(ucsd.includes("clipPath: \"inset(100% 0 0 0)\""), true, "the two-keyframe reveal start missing");
  assert.equal(ucsd.includes("clipPath: \"inset(0 0 0 0)\""), true, "the two-keyframe reveal end missing");
  assert.equal(ucsd.includes("RISE_EASE"), false, "the 9ef-era ease must be gone");
  assert.equal(ucsd.includes("cubic-bezier(0.22, 1, 0.36, 1)"), false, "the 9ef-era ease must be gone");
  // LIGHT FRONTS: two phrase-level glow layers + their inverse copies.
  // The whole-word glow knob (light()) is DELETED - paint owns color,
  // a narrow band owns luminosity.
  assert.equal(ucsd.includes("ucsd-navy-glow"), true, "the navy light front missing");
  assert.equal(ucsd.includes("ucsd-gold-glow"), true, "the gold light front missing");
  assert.equal(ucsd.includes("ucsd-glow-copy"), true, "the inverse-translate copy missing");
  assert.equal(ucsd.includes("translateY(${DS}px)"), true, "the light tide scan missing");
  assert.equal(ucsd.includes("translateY(${DE}px)"), true, "the light tide travel missing");
  assert.equal(ucsd.includes("translateY(${-DS}px)"), true, "the copy inverse scan missing");
  assert.equal(ucsd.includes("translateY(${-DE}px)"), true, "the copy inverse travel missing");
  assert.equal(ucsd.includes("const breathe"), true, "the light amplitude envelope missing");
  assert.equal(ucsd.includes("offset: 0.25, opacity"), true, "the navy light entrance envelope missing");
  assert.equal(ucsd.includes("offset: 0.3, opacity"), true, "the gold light entrance envelope missing");
  assert.equal(ucsd.includes("const light = ("), false, "the whole-word glow knob must be gone");
  assert.equal(ucsd.includes("NO_GLOW"), false, "the glow-knob constants must be gone");
  assert.equal(ucsd.includes("GLOW_EASE"), false, "the glow-knob ease must be gone");
  assert.equal(ucsd.includes("textShadow"), false, "the glow-knob shadow animation must be gone");
  // the light values: brighter tints, restrained halos, sharp glyphs
  assert.equal(css.includes("#8FBCEA"), true, "the navy light tint missing");
  assert.equal(css.includes("#F5D98C"), true, "the gold light tint missing");
  assert.equal(css.includes("0 0 9px rgba(143, 188, 234, 0.45)"), true, "the navy light-front halo missing");
  assert.equal(css.includes("0 0 14px rgba(80, 125, 190, 0.18)"), true, "the navy second halo missing");
  assert.equal(css.includes("0 0 9px rgba(245, 217, 140, 0.48)"), true, "the gold light-front halo missing");
  assert.equal(css.includes("0 0 14px rgba(240, 202, 103, 0.18)"), true, "the gold second halo missing");
  assert.equal(css.includes("mask-image:"), true, "the static light-tide mask missing");
  assert.equal(css.includes("black 55%,"), true, "the front-bright plateau missing");
  assert.equal(css.includes("rgba(0, 0, 0, 0.35)") && css.includes("rgba(0, 0, 0, 0.85)"), true, "the ramp feather + tide tail missing");
  assert.equal(ucsd.includes("maskPosition"), false, "the mask must stay static - transform only");
  assert.equal(ucsd.includes("maskSize"), false, "the mask must stay static - transform only");
  assert.equal(css.includes("text-shadow: 0 0 5px"), false, "the paint overlays must own color only - glow lives in the light fronts");
  // the staff/head formation split: navy timing builds the staff,
  // gold timing builds the head - both gold
  assert.equal(ucsd.includes("reveal(staffRef.current, T.navyEnd - T.navyStart, T.navyStart, false)"), true, "staff must build with the navy pass");
  assert.equal(ucsd.includes("reveal(headRef.current, T.goldEnd - T.goldStart, T.goldStart, false)"), true, "head must build with the gold pass");
  assert.equal(ucsd.includes("staffRef"), true, "the staff layer ref missing");
  assert.equal(ucsd.includes("headRef"), true, "the head layer ref missing");
  // the completion pulse: tiny drop-shadow + brightness 1.06, NO opacity change
  assert.equal(ucsd.includes("drop-shadow(0 0 6px rgba(242, 193, 78, 0.4)) brightness(1.06)"), true, "the restrained completion pulse missing");
  assert.equal(ucsd.includes("T.total + T.hold"), true, "the throw must wait for the full settle + hold");
  // the 1ad thin-staff trident geometry (pinned against the file read below)
  assert.equal(ucsd.includes("duration: T.goldEnd"), false, "the one-phase build era must be gone");
  // no later-era leftovers: no 9ef envelope constants, no brightness 1.06 absent, no one-phase build
  assert.equal(ucsd.includes("GLOW_NAVY ="), false, "the 9ef glow-array era must be gone");
  assert.equal(ucsd.includes("0 1px 10px"), false, "the 9ef offsets-style glow must be gone");
  assert.equal(ucsd.includes("settle(navyRef"), false, "the 9ef settle helper must be gone");
  assert.equal(ucsd.includes("GLOW_STAGGER"), false, "the per-letter glow wave must be gone");
  assert.equal(ucsd.includes("CREST_LETTER_MS"), false, "the crest letter envelope must be gone");
  assert.equal(ucsd.includes("ucsd-pl"), false, "the per-letter paint spans must be gone");
  assert.equal(ucsd.includes("ucsd-cl"), false, "the per-letter crest spans must be gone");
  assert.equal(ucsd.includes("crestWrap"), false, "the crest wrapper animation must be gone");
  assert.equal(ucsd.includes("crestLetters"), false, "the per-letter crest animation must be gone");
  assert.equal(ucsd.includes("navyCrestRef"), false, "the navy crest ref must be gone");
  assert.equal(ucsd.includes("goldCrestRef"), false, "the gold crest ref must be gone");
  assert.equal(ucsd.includes("maskPosition"), false, "the mask-position ride must be gone");
  assert.equal(ucsd.includes("WebkitMaskPosition"), false, "the webkit mask ride must be gone");
  assert.equal(ucsd.includes("maskSize"), false, "the animated mask-size must be gone");
  assert.equal(ucsd.includes("WebkitMaskSize"), false, "the webkit mask feather must be gone");
  assert.equal(ucsd.includes('duration: T.goldEnd, delay: 0'), false, "the whole-mark one-phase build must be gone - staff/head split restored");
  assert.equal(ucsd.includes("staffRef"), true, "the staff layer ref must be restored for the navy-timed reveal");
  assert.equal(ucsd.includes("0 0 14px"), false, "the big halos must be gone - restrained glow only");
  assert.equal(ucsd.includes("drop-shadow(0 0 6px"), true, "the restrained completion bloom missing");
  assert.equal(ucsd.includes("brightness(1.25)"), false, "the giant completion brightness must be gone");
  assert.equal(ucsd.includes("opacity: 0.92"), false, "the trident must never go translucent during the glint");
  assert.equal(ucsd.includes("brightness(1.08)"), false, "the 9ef-era brightness must be gone - the 1ad pulse uses 1.06");
  assert.equal(ucsd.includes("opacity: 0.97"), false, "the 9ef-era shimmer translucency must be gone");
  assert.equal(ucsd.includes("T.total + T.hold"), true, "the throw must wait for the full settle + hold");
  assert.equal(ucsd.includes("rotate("), true, "the throw rotation missing");
  assert.equal(ucsd.includes("const t = timers.current"), false, "cleanup must read the CURRENT refs (no stale array capture)");
  // the phrase-level stack: ONE base + TWO whole-phrase overlays, no per-glyph work
  assert.equal(ucsd.includes("LETTERS"), false, "the per-character split must be gone");
  assert.equal(ucsd.includes('"UC San Diego".split("")'), false, "per-glyph spans must be gone");
  assert.equal(ucsd.includes("ucsd-base"), true, "the ink base span missing");
  assert.equal(ucsd.includes("ucsd-navy"), true, "the phrase navy overlay missing");
  assert.equal(ucsd.includes("ucsd-gold"), true, "the phrase gold overlay missing");
  assert.equal(ucsd.includes("ucsd-navy-crest"), false, "the navy crest span must be gone");
  assert.equal(ucsd.includes("ucsd-gold-crest"), false, "the gold crest span must be gone");
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
  // the 1ad thin-staff geometry: the shaft is restored, the flared staff is gone
  assert.equal(trident.includes("M82 19.5 L82 24.5"), true, "the 1ad thin staff must be restored");
  assert.equal(trident.includes("M82 17.5 L82 30.5"), false, "the flared staff must be gone");
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
  // orb display quality: 28px box, NO overflow clipping on the orb
  // itself (the canvas caps to the box via max-width/height), and the
  // probe MUST mirror the live unit exactly (per-glyph spans + 4px
  // gap) or the spring clips the orb's right edge
  const orbBlock = css.slice(css.indexOf(".orb-24 {"), css.indexOf(".orb-24 canvas"));
  assert.equal(orbBlock.includes("width: 28px"), true, "the orb must display at 28px");
  assert.equal(orbBlock.includes("overflow"), false, "the orb box must never clip its canvas");
  assert.equal(css.includes(".word-morph-probe-flex {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;"), true, "the probe gap must match the live unit exactly");
  assert.equal(inf.includes("<span className=\"thinking-word\">\n            {\"thinking\".split(\"\")"), true, "the probe must mirror the live per-glyph spans (kerning parity)");
  assert.equal(inf.includes("word-morph"), true, "fixed morph slot missing");
  assert.equal(inf.includes("THINK_MS = 2500"), true, "2.5s inference hold missing");
  assert.equal(inf.includes("INFER_ORB_STATES"), true, "random orb states must exist");
  assert.equal(inf.includes("pickOrbState"), true, "per-run random orb selection missing");
  assert.equal(inf.includes("state={orbState}"), true, "live orb must use the randomized state");
  assert.equal(inf.includes('{\"thinking\".split(\"\")'), true, "active word is lowercase thinking (per-glyph wave)");
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
  // the TWO-MOTION interaction: dispense -> settled -> exit
  assert.equal(bbStage.includes('"dropping"'), true, "the dispense state missing");
  assert.equal(bbStage.includes('"settled"'), true, "the settled state missing");
  assert.equal(bbStage.includes('"exiting"'), true, "the exit state missing");
  // MOTION QUALITY: one full parabola per rebound (no stitched
  // rise/fall easing), decreasing heights, exact durations
  assert.equal(bbStage.includes("FALL_MS = 420"), true, "the ~420ms drop missing");
  assert.equal(bbStage.includes("{ apex: 24, dur: 380 }"), true, "rebound 1 (24px/380ms) missing");
  assert.equal(bbStage.includes("{ apex: 12, dur: 260 }"), true, "rebound 2 (12px/260ms) missing");
  assert.equal(bbStage.includes("{ apex: 5, dur: 180 }"), true, "rebound 3 (5px/180ms) missing");
  assert.equal(bbStage.includes("4 * REBOUNDS"), true, "the single-parabola rebounds missing");
  assert.equal(bbStage.includes("REBOUND_1_APEX"), false, "the old stitched rebound scheme must be gone");
  assert.equal(bbStage.includes("SETTLE_MS = FALL_MS + REBOUNDS[0].dur + REBOUNDS[1].dur + REBOUNDS[2].dur"), true, "the recomputed settle deadline missing");
  // refresh-rate-INDEPENDENT squash: real elapsed time only
  assert.equal(bbStage.includes("squashStart"), true, "the elapsed-time impact squash missing");
  assert.equal(bbStage.includes("ackStart"), true, "the elapsed-time acknowledgment squash missing");
  assert.equal(bbStage.includes("-="), false, "no per-frame decrements - the animation must not assume 60Hz");
  // the realistic distance-scaled bounce chain: no fixed arc count,
  // no shrink-out - the ball bounces its way off the screen at full scale
  assert.equal(bbStage.includes("EXIT_APEX = 30"), true, "the uniform 30px bounce apex missing");
  assert.equal(bbStage.includes("EXIT_FINAL_APEX = 55"), true, "the final mid-air rise missing");
  assert.equal(bbStage.includes("Math.round(exitDist / EXIT_PX_PER_BOUNCE)"), true, "the distance-scaled bounce count missing");
  assert.equal(bbStage.includes("EXIT_FINAL_APEX * (2 * s - s * s)"), true, "the final rise-only arc missing");
  assert.equal(bbStage.includes("SPIN_PER_ARC * (arc + s)"), true, "the continuous per-arc rotation missing");
  assert.equal(bbStage.includes("x >= screenRight + BALL / 2"), true, "the fully-past-the-screen-edge exit check missing");
  // the word IS measured now - the ball dispenses directly below it
  assert.equal(bbStage.includes('aria-label="basketball"'), true, "the word-center dispense measurement missing");
  // the ball becomes clickable only once settled
  assert.equal(bbStage.includes("el.onclick"), true, "the clickable settled ball missing");
  assert.equal(bbStage.includes("pointerEvents: phase === \"settled\" ? \"auto\" : \"none\""), true, "the pointer-events gating missing");
  // the OLD autonomous crossing is gone: no fixed run, no auto-unmount
  assert.equal(bbStage.includes("GRAVITY"), false, "real physics must be gone");
  assert.equal(bbStage.includes("RESTITUTION"), false, "the decaying bounce must be gone");
  assert.equal(bbStage.includes("screenRight = Math.max(dividerRight, window.innerWidth)"), true, "the exit must measure the real screen edge to leave it");
  assert.equal(bbStage.includes("DUR_MS"), false, "the autonomous crossing must be gone - the ball waits for the click");
  // the divider rect drives a VIEWPORT-FIXED overlay (exact ground)
  assert.equal(bbStage.includes("#things-done"), true, "the divider ground line measurement missing");
  assert.equal(bbStage.includes("bb-overlay"), true, "the viewport-fixed overlay missing");
  // the impact is ONLY the in-ball light sweep - no ground dots
  assert.equal(bbStage.includes("bb-sweep"), true, "the in-ball light sweep missing");
  assert.equal(bbStage.includes("bb-contact-glow"), false, "the ground glow must be gone");
  assert.equal(bbStage.includes("bb-particle"), false, "pixel debris must be gone");
  assert.equal(bbStage.includes("bb-shadow"), false, "the old contact shadow must be gone");
  // the ball: symmetric seams, NO vertical center line
  assert.equal(bbStage.includes("M2.8 10 Q14 -3 25.2 10"), true, "the upper symmetric seam missing");
  assert.equal(bbStage.includes("M2.8 18 Q14 31 25.2 18"), true, "the lower symmetric seam missing");
  assert.equal(bbStage.includes("M2 14h24"), true, "the straight horizontal center seam missing");
  assert.equal(bbStage.includes("v24.4"), false, "the vertical center line must be gone");
  assert.equal(bbStage.includes("PixelBall"), false, "the 8-bit sprite must be gone");
  // the new ball ROTATES forward - the old no-spin assumption is gone
  assert.equal(bbStage.includes("SPINS"), false, "the no-rotation assumption must be gone");
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
  assert.equal(music.includes("requestAnimationFrame"), false, "no measurement frames - the island is in flow");
  // ONE absolute clock: the shell states are dispatched via the
  // reducer's STABLE dispatch on the SAME MUSIC_TIMING table. The
  // Cult queue is BANNED here - its delays are cumulative, which
  // desyncs the shell from the content timeline.
  assert.equal(music.includes("useScheduledAnimations"), false, "the cumulative queue must be gone - ONE absolute clock only");
  assert.equal(music.includes('dispatch({ type: "SET_SIZE"'), true, "the shell states must be driven by the stable dispatch");
  assert.equal(music.includes('newSize: SIZE_PRESETS.COMPACT }'), true, "the compact dispatch missing");
  // the close does NOT dispatch EMPTY: the wrapper's 400/30 spring
  // rigid-body-scales the whole island to zero instead (one dissolve)
  assert.equal(music.includes('newSize: SIZE_PRESETS.EMPTY }'), false, "the empty dispatch must be gone during the close");
  // NO word->stage travel architecture: the island lives in flow in
  // the stage's whitespace - no portal, no seed, no travel spring
  assert.equal(music.includes("createPortal"), false, "no portal - the island is in flow below the intro");
  assert.equal(music.includes("findWordOrigin"), false, "no word measurement - nothing flies out of the word");
  assert.equal(music.includes("music-seed-skin"), false, "the seed skin must be gone (the shell IS the tiny pill)");
  assert.equal(music.includes("SEED_SPRING"), false, "the travel spring must be gone");
  assert.equal(music.includes("layoutId"), false, "the invisible-anchor layoutId hack must be gone");
  assert.equal(music.includes("music-island-anchor"), false, "the invisible anchor must be gone");
  // THE EXPANDED CHOREOGRAPHY: the SAME shell blooms COMPACT ->
  // MUSIC_EXPANDED -> COMPACT -> EMPTY on one absolute clock. The
  // accepted compact state is untouched; COMPACT_LONG stays banned.
  assert.equal(music.includes("COMPACT_LONG"), false, "COMPACT_LONG must be gone from the choreography");
  assert.equal(music.includes('newSize: SIZE_PRESETS.MUSIC_EXPANDED }'), true, "the music-expanded dispatch missing");
  assert.equal(music.includes("MUSIC_EXPANDED"), true, "the dedicated expanded preset missing");
  assert.equal(music.includes("metaMount"), false, "the metadata mount must be gone");
  assert.equal(music.includes("metaExit"), false, "the metadata exit must be gone");
  assert.equal(music.includes("dynamic-island-meta"), false, "the metadata DOM must be gone");
  // the title/artist belong ONLY to the true expanded Now Playing view
  assert.equal(music.includes("favoriteSong.title"), true, "the title must render in the expanded view");
  assert.equal(music.includes("favoriteSong.artist"), true, "the artist must render in the expanded view");
  assert.equal(music.includes("favoriteSong.artwork"), true, "the album artwork must stay");
  assert.equal(music.includes("dynamic-island-wave"), true, "the waveform missing");
  assert.equal(music.includes("~3.3s"), false, "the old 3.3s lifecycle must be gone");
  assert.equal(music.includes("~2.4s"), true, "the ~2.4s settled hold missing");
  // ONE visible object, absolute in the fixed stage: no flow, no shift
  assert.equal(music.includes("music-projectile"), true, "the absolute island home missing");
  assert.equal(music.includes("music-island-press-wrap"), true, "the press/fade wrapper missing");
  assert.equal(music.includes("stiffness: 400"), true, "the matched spring must mirror the shell");
  assert.equal(music.includes('type: "spring"'), true, "the shared geometry must be a spring");
  // the force-touch press: STORED COMPRESSION (scaleX .982 / scaleY
    // .95 / y 1) held ~40ms; on release the shell blooms and the whole
    // island rides a VERY subtle over-bloom (~1.018) into a 1.0 settle
    assert.equal(music.includes("BLOOM_OVERSHOOT"), true, "the subtle shell over-bloom missing");
    assert.equal(music.includes("scaleX: closing ? 0 : pressed ? 0.982 : expanded ? [1, 1.018, 1.002, 1] : 1"), true, "the stored compression + over-bloom missing");
    assert.equal(music.includes("scaleY: closing ? 0 : pressed ? 0.95 : expanded ? [1, 1.012, 1.001, 1] : 1"), true, "the vertical compression missing");
    assert.equal(music.includes("scaleX: closing ? 0 : pressed ? 0.982"), true, "the closing rigid-body scale branch missing");
    assert.equal(music.includes("scaleY: closing ? 0 : pressed ? 0.95"), true, "the closing rigid-body scale branch missing");
  // the waveform must stay ONE object through compact -> expanded ->
  // compact: same warm color, same animation, same DOM node - the
  // old quiet/off-white expanded override is GONE
  assert.equal(music.includes("is-expanded"), false, "no expanded class - the wave stays identical");
  // the state machine stays small: the five lifecycle phases
  assert.equal(music.includes('"opening"'), true, "the opening phase missing");
  assert.equal(music.includes('"compact"'), true, "the compact phase missing");
  assert.equal(music.includes('"expanded"'), true, "the expanded phase missing");
  assert.equal(music.includes('"compactClosing"'), false, "the compact-closing phase must be gone - ONE direct exit");
  // the ROOT CAUSE fix: art + waveform STAY in the EXPANDED geometry
  // while they fade during the close (never retarget compact)
  assert.equal(music.includes("phase === \"expanded\" || phase === \"closing\""), true, "the shared flag must hold through the closing phase");
    // ONE absolute clock, one owner per property, no imperative calls
    assert.equal(music.includes("bloom: 740"), true, "the bloom beat missing");
    assert.equal(music.includes("pressStart: 650"), true, "the force-touch press missing");
    assert.equal(music.includes("pressRelease: 695"), true, "the brief stored hold (~40ms) then the release");
    assert.equal(music.includes("metaIn: 840"), true, "metadata must enter before the shell settles");
    assert.equal(music.includes("exitStart: 3525"), true, "the direct-to-EMPTY exit beat missing");
      assert.equal(music.includes("uiLeave: 3500"), true, "the ~2.4s expanded hold beat missing");
      assert.equal(music.includes("fadeShared: 3580"), true, "the shared-fade beat missing");
      assert.equal(music.includes("done: 3820"), true, "the idle beat missing");
      assert.equal(music.includes("~300ms collapse/dissolve"), true, "the one ~300ms exit gesture missing");
      assert.equal(music.includes("MUSIC_TIMING.collapse"), false, "the sequential COMPACT stop must be gone");
  // intro mirrors outro: fade 0 -> 1 in, 1 -> 0 out + slight squash
  assert.equal(music.includes("initial={{ opacity: 0 }}"), true, "the intro fade-in missing");
  assert.equal(music.includes("opacity: closing ? 0 : 1"), true, "the outro fade-out missing");
  assert.equal(music.includes("scaleX: closing ? 0 : pressed ? 0.982 : expanded ? [1, 1.018, 1.002, 1] : 1"), true, "the unified-spring rigid-body collapse missing");
  assert.equal(music.includes("scaleY: closing ? 0 : pressed ? 0.95 : expanded ? [1, 1.012, 1.001, 1] : 1"), true, "the unity collapse branch missing");
  assert.equal(music.includes("transformOrigin: \"center\""), true, "the center-anchored collapse missing");
  // the close is ONE rigid-body spring dissolve: the shell is HELD at
  // the expanded geometry (no EMPTY dispatch racing the content)
  assert.equal(music.includes("NO EMPTY dispatch"), true, "the EMPTY dispatch must be gone from the close");
  // ONE animation system: Motion declarative only. No WAAPI, no CSS
  // keyframes for phase transitions, no conditional mounting.
  assert.equal(music.includes(".animate("), false, "no imperative animation calls are allowed");
  assert.equal(music.includes("DynamicContainer"), false, "the kit container must not own content fades");
  assert.equal(music.includes("expanded &&"), false, "the expanded UI must stay mounted (motion targets only)");
  assert.equal(music.includes("island-expanded-ui"), true, "the expanded Now Playing surface missing");
  assert.equal(music.includes("island-progress"), true, "the progress rail missing");
  assert.equal(music.includes("island-controls"), true, "the transport controls missing");
  assert.equal(music.includes("island-time"), true, "the mock timestamps missing");
  assert.equal(music.includes("island-progress-thumb"), true, "the progress thumb missing");
  // the bottom row is ONLY previous | PAUSE | next - no star, no AirPlay
  assert.equal(music.includes("island-star"), false, "the favorite star must be gone");
  assert.equal(music.includes("island-airplay"), false, "the AirPlay glyph must be gone");
  assert.equal(music.includes("island-skip-prev"), true, "the rounded skip-back silhouette missing");
  assert.equal(music.includes("island-skip-next"), true, "the rounded skip-forward silhouette missing");
  assert.equal(music.includes("island-control-play"), true, "the Pause control missing");
  // the skip icons: TWO PLAIN FILLED TRIANGLES, literally - no stroke,
  // no Q curves, no bars, no chevrons, no extra geometry
  assert.equal(music.includes('points="11,6 3,12 11,18"'), true, "the previous-skip triangle pair missing");
  assert.equal(music.includes('points="5,6 13,12 5,18"'), true, "the next-skip triangle pair missing");
  assert.equal(music.includes("<polygon"), true, "the skip icons must be polygons");
  assert.equal(music.includes('fill="currentColor"'), true, "the skip icons must be solid fill");
  assert.equal(music.includes("stroke=\"currentColor\""), false, "the skip icons must have NO stroke");
  assert.equal(music.includes("Q14.9"), false, "no Q-curve wedges - literally two triangles");
  assert.equal(music.includes('rect x="21.3"'), false, "the skip BACK end bar must be gone");
  assert.equal(music.includes('rect x="0.5"'), false, "the skip FORWARD end bar must be gone");
  assert.equal(music.includes('width="28"'), true, "the skip icons must be ~28px");
  assert.equal(music.includes("EXIT_EASE"), true, "the smooth exit curve missing");
  assert.equal(music.includes("cubic-bezier(0.4, 0, 0.2, 1)"), true, "the eased in-out exit missing");
  assert.equal(music.includes("delay: 2650"), false, "the old cumulative schedule must be gone");
  assert.equal(music.includes("delay: 2920"), false, "the old cumulative schedule must be gone");
  // content leaves AS the shell relaxes: the expanded UI fades while
  // the contraction runs its first ~30% - a continuous dissolve
  assert.equal(music.includes("uiLeave: 3500"), true, "the expanded-content exit beat missing");
  assert.equal(music.includes("el.animate"), false, "the row WAAPI must be gone (edge-aligned content only)");
  assert.equal(music.includes("DynamicIslandProvider"), true, "island must use the official provider");
  assert.equal(music.includes("SIZE_PRESETS.COMPACT"), true, "the compact preset missing");
  assert.equal(music.includes("favoriteSong.artwork"), true, "the album art missing");
  assert.equal(music.includes("ThinkingOrb"), false, "music must have zero ThinkingOrb");
  assert.equal(music.includes("MUSIC_ORB_STATES"), false, "music orb states must be gone");
  assert.equal(music.includes("STEP_MS"), false, "frame stepping must be gone");
  const musicWord = read("components/MusicWord.tsx");
  assert.equal(musicWord.includes("layoutId"), false, "the word must not render an invisible seed");
  assert.equal(musicWord.includes("music-seed"), false, "the invisible seed class must be gone");
  // repeat clicks while active: IGNORED, never a toggle
  const provider = read("components/StageProvider.tsx");
  assert.equal(provider.includes('(prev === a ? prev : a)'), true, "repeat clicks must be ignored");
  assert.equal(provider.includes('a === "music" ? null'), false, "the music toggle-close must be gone");
  const stageCode = read("components/InteractionStage.tsx");
  assert.equal(stageCode.includes("AnimatePresence"), true, "stage must keep the swap machinery");
  assert.equal(stageCode.includes('mode="wait"'), true, "stage must swap with mode=wait");
  assert.equal(stageCode.includes('"basketball"'), true, "stage must host basketball");
  assert.equal(stageCode.includes('"ucsd"'), false, "stage must NOT host ucsd (trident flies off the viewport)");
  const css = read("globals.css");
  assert.equal(css.includes(".interaction-stage"), true, "stage CSS missing");
  assert.equal(css.includes(".music-island-anchor"), false, "the invisible anchor CSS must be gone");
  assert.equal(css.includes(".music-projectile"), true, "the absolute island home CSS missing");
  assert.equal(css.includes(".music-island-press-wrap"), true, "the press/fade wrapper CSS missing");
  assert.equal(css.includes(".music-projectile"), true, "the absolute island home missing");
  assert.equal(css.includes("top: 0"), true, "the island lives at the top of the fixed stage whitespace");
  assert.equal(css.includes("margin-top: 24px"), false, "the in-flow margin must be gone (absolute now)");
  assert.equal(css.includes(".music-seed-skin"), false, "the seed skin CSS must be gone (no travel)");
  assert.equal(css.includes(".island-star"), false, "the favorite star CSS must be gone too");
  assert.equal(css.includes("max-height: 112px"), false, "the mobile expanded cap must be GONE - the island keeps its real 335x140 proportions");
  assert.equal(css.includes("background: #000000"), true, "the PURE BLACK shell missing");
  assert.equal(css.includes("rgba(255, 255, 255, 0.035)"), true, "the invisible hairline missing");
  assert.equal(css.includes("box-shadow: none"), true, "the shell must not float like a card");
  assert.equal(css.includes("max-width: calc(100vw - 22px)"), true, "the mobile viewport guard missing");
  // the OLD generic glass block is DELETED - nothing may override the
  // black surface (specular insets + white gradient + blur)
  assert.equal(css.includes(".dynamic-island-shell {"), false, "the old glass card block must be gone");
  assert.equal(css.includes("backdrop-filter: blur(18px) saturate(1.4)"), false, "the glass blur must be gone");
  // the Apple COMPACT anatomy: edge-aligned art + waveform, NO metadata
  assert.equal(css.includes("left: 8px"), true, "the art must cling to the leading edge");
  assert.equal(css.includes("width: 28px"), true, "the intimate 28px artwork missing");
  assert.equal(css.includes(".dynamic-island-wave"), true, "the waveform CSS missing");
  assert.equal(css.includes("wave-pulse"), true, "the waveform pulse missing");
  assert.equal(css.includes(".dynamic-island-eq"), false, "the generic 4-bar equalizer must be gone");
  assert.equal(css.includes("eq-bounce"), false, "the equalizer bounce must be gone");
  assert.equal(css.includes(".dynamic-island-meta"), false, "the metadata CSS must be gone");
  assert.equal(css.includes("island-meta-in"), false, "the metadata animation must be gone");
  // ONE animation system: the art/wave/UI entrances are Motion's job -
  // the CSS must define no phase-transition keyframes or transitions
  assert.equal(css.includes("island-art-in"), false, "the CSS art entrance must be gone (Motion owns it)");
  assert.equal(css.includes("island-wave-in"), false, "the CSS wave entrance must be gone (Motion owns it)");
  assert.equal(css.includes("expanded-piece-in"), false, "the CSS UI entrance must be gone (Motion owns it)");
  assert.equal(css.includes(".island-row-content.is-expanded .dynamic-island-art"), false, "no CSS placement overrides - Motion owns placement");
  // the waveform is ONE object from compact through expanded: the old
  // quiet/off-white override must be gone - same warm gold, same pulse
  assert.equal(css.includes("wave-pulse-soft"), false, "the quiet-wave override must be gone");
  assert.equal(css.includes(".island-row-content.is-expanded"), false, "no expanded class CSS at all - wave stays identical");
  // Apple-native type scoped to the island + the CENTERED controls
// container (~55% of the width, never stretched edge to edge)
  assert.equal(css.includes('"SF Pro Text"'), true, "the Apple type stack missing");
  assert.equal(css.includes("width: 188px"), true, "the centered controls container missing");
  assert.equal(css.includes("grid-template-columns: repeat(3, 1fr)"), false, "the full-width 3-column grid must be gone");
  // reduced motion is handled in the component - there is no travel to
  // hide and no separate reduced stage (the display:none bug is gone)
  assert.equal(css.includes(".music-projectile.is-reduced"), false, "the reduced travel stage must be gone");
  assert.equal(/\.music-projectile\.is-reduced\s*\{[^}]*display: none/.test(css), false, "reduced motion must NOT be hidden");
  // the stage is a FIXED-height playground - it never breathes for an
  // animation, so the old 26px rest + active-expansion rules are gone
  const stageRule = css.match(/\.interaction-stage\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.equal(stageRule.includes("height: 158px"), true, "stage must be a fixed 158px playground (grew to contain the full 335x140 island)");
  assert.equal(stageRule.includes("transition"), false, "the stage must never transition its height");
  assert.equal(css.includes(".interaction-stage.is-active"), false, "the active expansion must be gone");
  assert.equal(css.includes("height: 158px"), true, "mobile stage height missing");
  assert.equal(css.includes("height: 143px"), true, "desktop stage height missing");
  assert.equal(css.includes(".island-row-content"), true, "island row CSS missing");
  assert.equal(css.includes(".music-island-shell"), true, "island shell CSS missing");
  assert.equal(css.includes(".dynamic-island-wave"), true, "waveform bars CSS missing");
  assert.equal(css.includes(".dynamic-island-eq"), false, "the old equalizer CSS must be gone");
  assert.equal(css.includes(".dynamic-island-title"), false, "the metadata typography must be gone");
  assert.equal(css.includes(".dynamic-island-description"), false, "the metadata typography must be gone");
  assert.equal(css.includes("underline dotted"), false, "dotted underline affordance must be gone");
  for (const stale of ["word-ball", "badge-rule", "badge-trident-wrap", "badge-type", "badge-identity", "dynamic-island-progress", "word-notch", "word-morph-resolve", "dynamic-island-dot", ".dynamic-island-content", ".dynamic-island-container", "buildFrames", "STEP_MS", "MUSIC_ORB_STATES"]) {
    assert.equal(source.includes(stale), false, `stale class present: ${stale}`);
  }
  const fav = read("config/favorite-song.ts");
  assert.equal(fav.includes("Kick"), true, "favorite song missing");
  assert.equal(fav.includes("Future"), true, "favorite artist missing");
});