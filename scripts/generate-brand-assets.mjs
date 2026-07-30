#!/usr/bin/env node
/**
 * Generates Herald's raster brand assets from the source seal SVG
 * (public/brand/herald-icon.svg) using sharp.
 *
 * Why this exists: the seal SVG is the single source of truth for the mark
 * (see the comments in herald-icon.svg for the design rationale). Every
 * raster derivative — favicon, PWA icons, apple-touch-icon, OG fallback —
 * must be regenerated from it rather than hand-exported, so a future
 * mark tweak only requires editing the SVG and re-running this script.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const ICON_SVG_PATH = path.join(root, "public/brand/herald-icon.svg");
const iconSvg = readFileSync(ICON_SVG_PATH, "utf8");

// The seal SVG's viewBox is 64x64 user units, and sharp/librsvg rasterizes
// SVGs with no explicit width/height at 1 user unit == 1px at density 72.
// To get a crisp native raster at a target pixel size (rather than decoding
// small and blurring on resize), scale density proportionally.
const SVG_NATIVE_SIZE = 64;
const BASE_DENSITY = 72;

const SEAL_RED = "#8a2f22"; // matches --herald-seal in app/globals.css
const PAPER = "#fbfaf7"; // matches the light-theme --background
const INK = "#030609"; // matches the dark-theme --background (app default theme)

async function renderIconPng(size) {
  const density = BASE_DENSITY * (size / SVG_NATIVE_SIZE);
  return sharp(Buffer.from(iconSvg), { density })
    .resize(size, size)
    .png()
    .toBuffer();
}

/**
 * Packs raw PNG buffers into a valid multi-image .ico container using the
 * modern (Vista+) PNG-in-ICO format, universally supported by browsers and
 * OSes. No ico-encoding dependency is installed in this project, and the
 * container format is simple enough to write by hand: a 6-byte ICONDIR
 * header, one 16-byte ICONDIRENTRY per image, then the raw PNG bytes
 * back-to-back.
 */
function buildIco(pngBuffers, sizes) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const count = pngBuffers.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved, must be 0
  header.writeUInt16LE(1, 2); // image type: 1 = icon
  header.writeUInt16LE(count, 4);

  let offset = HEADER_SIZE + ENTRY_SIZE * count;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const png = pngBuffers[i];
    const entry = Buffer.alloc(ENTRY_SIZE);
    // 0 means "256" per the ICO spec; all our sizes are < 256 so this is
    // just the literal size.
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette (0 = no palette, true color)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // size of this image's data
    entry.writeUInt32LE(offset, 12); // offset of this image's data
    offset += png.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

function buildOgSvg() {
  // A simple branded fallback card for pages without a dynamic OG image:
  // the seal on the app's default (dark) background, the wordmark, and the
  // brand tagline. The seal SVG's monogram knockout is real transparency,
  // so it composites correctly straight onto this background without any
  // extra masking.
  const sealSize = 260;
  const sealX = 140;
  const sealY = (630 - sealSize) / 2;

  // Re-host the seal path at its native 0..64 box, scaled/translated via a
  // <g> transform rather than re-deriving the geometry.
  const scale = sealSize / SVG_NATIVE_SIZE;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${INK}" />
    <g transform="translate(${sealX}, ${sealY}) scale(${scale})">
      <path
        fill="${SEAL_RED}"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M32 0a32 32 0 1 0 0 64 32 32 0 0 0 0-64ZM17 16h7v32h-7V16Zm23 0h7v32h-7V16ZM24 32l8-4 8 4v6l-8-4-8 4v-6Z"
      />
    </g>
    <text
      x="${sealX + sealSize + 60}"
      y="330"
      font-family="Georgia, 'Times New Roman', serif"
      font-size="96"
      font-weight="700"
      fill="#fbfaf7"
      letter-spacing="-2"
    >Herald</text>
    <text
      x="${sealX + sealSize + 60}"
      y="380"
      font-family="Arial, Helvetica, sans-serif"
      font-size="30"
      fill="#9a9490"
    >Announced properly.</text>
  </svg>`;
}

async function main() {
  const outputs = [];

  // favicon.ico — multi-size 16/32/48, replacing the Next default at
  // app/favicon.ico (this project already uses the static app/favicon.ico
  // App Router convention rather than app/icon.*, so we follow it).
  const icoSizes = [16, 32, 48];
  const icoPngs = await Promise.all(icoSizes.map(renderIconPng));
  const icoBuffer = buildIco(icoPngs, icoSizes);
  const icoPath = path.join(root, "app/favicon.ico");
  writeFileSync(icoPath, icoBuffer);
  outputs.push([icoPath, `ico (${icoSizes.join("/")})`]);

  // PWA / manifest icons.
  for (const size of [192, 512]) {
    const buf = await renderIconPng(size);
    const outPath = path.join(root, `public/icon-${size}.png`);
    writeFileSync(outPath, buf);
    outputs.push([outPath, `${size}x${size}`]);
  }

  // apple-touch-icon.png — iOS doesn't respect transparency, so the
  // transparent disc background AND the monogram knockout (also
  // transparent in the source SVG) both get flattened onto an opaque
  // backdrop. Paper (the light-theme background) is used rather than the
  // seal red itself, so the red disc still reads as a mark rather than
  // disappearing into a same-color square, and the knockout shows through
  // as paper — literally a seal pressed into paper.
  const appleBase = await sharp(Buffer.from(iconSvg), {
    density: BASE_DENSITY * (180 / SVG_NATIVE_SIZE),
  })
    .resize(180, 180)
    .png()
    .toBuffer();
  const appleFlattened = await sharp(appleBase)
    .flatten({ background: PAPER })
    .png()
    .toBuffer();
  const applePath = path.join(root, "public/apple-touch-icon.png");
  writeFileSync(applePath, appleFlattened);
  outputs.push([applePath, "180x180"]);

  // OG fallback card.
  const ogSvg = buildOgSvg();
  const ogBuffer = await sharp(Buffer.from(ogSvg)).png().toBuffer();
  const ogPath = path.join(root, "public/og-fallback.png");
  writeFileSync(ogPath, ogBuffer);
  outputs.push([ogPath, "1200x630"]);

  console.log("Generated brand assets:");
  for (const [p, desc] of outputs) {
    console.log(`  ${path.relative(root, p)} (${desc})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
