// Renders the showcase voiceover lines with Kokoro-82M (Apache-2.0) via kokoro-js.
// Usage: node scripts/voice.mjs <voiceId> <outDir> [speed=1.0]
//        node scripts/voice.mjs --list
// Output: <outDir>/vo-1-hook.wav ... vo-6-cta.wav (trimmed, 48 kHz mono 16-bit).
import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
env.cacheDir = path.join(root, ".cache"); // git-ignored model cache

export const LINES = [
  ["vo-1-hook", "Still handing out paper cards?"],
  ["vo-2-tap", "One tap on any phone, and they have your number."],
  [
    "vo-3-profile",
    "Your profile opens instantly. No app to download. Your work, your listings, and one button to save your contact.",
  ],
  ["vo-4-leads", "When they leave their details, you get the lead, and you follow up."],
  ["vo-5-cards", "Brokers, shop owners, designers, students. Your card. Your work."],
  ["vo-6-cta", "Create your free profile at Connecta P.H. dot vercel dot app."],
];

const [voice, outArg, speedArg] = process.argv.slice(2);
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
  device: "cpu",
});

if (voice === "--list") {
  console.log(Object.keys(tts.voices).join("\n"));
  process.exit(0);
}
if (!voice || !outArg) {
  console.error("usage: node scripts/voice.mjs <voiceId> <outDir> [speed]");
  process.exit(1);
}
if (!(voice in tts.voices)) {
  console.error(`unknown voice "${voice}"`);
  process.exit(1);
}

const speed = Number(speedArg ?? 1);
const outDir = path.resolve(outArg);
mkdirSync(outDir, { recursive: true });

// Trim leading/trailing silence at -50 dB, then 48 kHz mono 16-bit.
const trim =
  "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05," +
  "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse";

for (const [name, text] of LINES) {
  const raw = path.join(outDir, `${name}.raw.wav`);
  const out = path.join(outDir, `${name}.wav`);
  const audio = await tts.generate(text, { voice, speed });
  await audio.save(raw);
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", raw, "-af", trim, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", out],
    { stdio: "inherit" },
  );
  rmSync(raw);
  console.log(`${name}.wav  (${voice}, speed ${speed})`);
}
