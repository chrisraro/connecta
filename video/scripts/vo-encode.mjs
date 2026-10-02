// Encodes the rendered voiceover WAVs to mono 48 kHz MP3 in video/public/vo/ and rewrites src/vo-timing.json.
// Usage: node scripts/vo-encode.mjs <wavDir>   (normally run through `npm run vo`)
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FPS = 30;
/** Every line is levelled to this integrated loudness, then peak-limited, so the voice sits well above the ducked music. */
const TARGET_LUFS = -15;
const PEAK_LIMIT = 0.8; // linear, about -2 dBFS
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wavDir = path.resolve(process.argv[2] ?? "out/vo");
const outDir = path.join(root, "public", "vo");
mkdirSync(outDir, { recursive: true });

/** [file stem, scene] — the "cards" line is spoken over the personas scene. */
const LINES = [
  ["vo-1-hook", "hook"],
  ["vo-2-tap", "tap"],
  ["vo-3-profile", "profile"],
  ["vo-4-leads", "leads"],
  ["vo-5-cards", "personas"],
  ["vo-6-cta", "cta"],
];

function loudness(wav) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", wav, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = log.slice(log.lastIndexOf("Summary")).match(/I:\s+(-?[\d.]+) LUFS/);
  if (!m) throw new Error(`could not measure ${wav}`);
  return Number(m[1]);
}

const timing = LINES.map(([id, scene]) => {
  const file = `vo/${id}.mp3`;
  const mp3 = path.join(root, "public", file);
  const wav = path.join(wavDir, `${id}.wav`);
  const gain = TARGET_LUFS - loudness(wav);
  const level = `volume=${gain.toFixed(2)}dB,alimiter=limit=${PEAK_LIMIT}:level=disabled`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", level, "-ar", "48000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "112k", mp3], { stdio: "inherit" });
  // Measure the encoded file: that is what Remotion plays, and it includes the encoder delay.
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).toString().trim());
  const frames = Math.ceil(seconds * FPS);
  console.log(`${file}  ${seconds.toFixed(3)} s  ${frames} frames`);
  return { id, file, scene, frames };
});

writeFileSync(path.join(root, "src", "vo-timing.json"), JSON.stringify(timing, null, 2) + "\n");
