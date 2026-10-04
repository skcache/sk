/**
 * The song shown when the music island opens.
 *
 * Edit this file to make it your own song. `artwork` is an image path
 * inside /public (official single art at public/album-art.jpg).
 *
 * `elapsed` / `duration` are seconds into the (illustrative) playback
 * readout. Every derived value - the two timestamps AND the progress
 * rail - comes from these two numbers, so they can never disagree.
 */
export const favoriteSong = {
  title: "Kick",
  artist: "Future",
  artwork: "/album-art.jpg",
  elapsed: 80, // 1:20
  duration: 135, // 2:15
} as const;

/**
 * The ONE progress percentage (80 / 135 = 59.26%). The rail fill and
 * the thumb both read it - via the `--island-progress` CSS variable -
 * so the two can never drift apart.
 */
export const playbackProgress = `${(
  (favoriteSong.elapsed / favoriteSong.duration) *
  100
).toFixed(2)}%`;
