// Checks the rendered MP4 against the spec: 1080x1920, 30 fps, 36 s ± 1 s, with an audio stream.
import { execFileSync } from "node:child_process";

const file = process.argv[2];
const out = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", file]).toString(),
);
const audio = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "json", file]).toString());
const hasAudio = audio.streams.length > 0;
const { width, height, r_frame_rate } = out.streams[0];
const [n, d] = r_frame_rate.split("/").map(Number);
const fps = n / d;
const duration = Number(out.format.duration);
const problems = [];
if (!hasAudio) problems.push("no audio stream");
if (width !== 1080 || height !== 1920) problems.push(`size ${width}x${height}, want 1080x1920`);
if (Math.abs(fps - 30) > 0.01) problems.push(`fps ${fps}, want 30`);
if (Math.abs(duration - 36) > 1) problems.push(`duration ${duration}s, want 36 ± 1`);
console.log(JSON.stringify({ width, height, fps, duration, audio: hasAudio, ok: problems.length === 0, problems }));
process.exit(problems.length ? 1 : 0);
