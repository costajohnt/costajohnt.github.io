/**
 * optimize-covers.mjs
 *
 * Converts assets/covers/*.{png,jpeg,jpg} into web-sized WebP variants:
 *   assets/covers/webp/<name>.webp        (max 720px wide, post covers)
 *   assets/covers/webp/<name>-thumb.webp  (112px wide, list thumbnails @2x)
 *   assets/covers/og/<name>.jpg           (max 1200px wide, og:image / RSS)
 * and writes data/cover-meta.json with the output dimensions so templates
 * can emit width/height attributes (no layout shift).
 *
 * Requires ImageMagick (`magick`) locally. Run when adding or changing a
 * cover, then commit the outputs; CI never needs the tooling.
 *
 * Usage: node scripts/optimize-covers.mjs
 */

import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COVERS_DIR = join(ROOT, 'assets', 'covers');
const OUT_DIR = join(COVERS_DIR, 'webp');
const OG_DIR = join(COVERS_DIR, 'og');
const META_PATH = join(ROOT, 'data', 'cover-meta.json');

function magick(args) {
  return execFileSync('magick', args, { encoding: 'utf8' }).trim();
}

function dims(path) {
  const [w, h] = magick(['identify', '-format', '%w %h', path]).split(' ').map(Number);
  return { w, h };
}

function main() {
  const sources = readdirSync(COVERS_DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (sources.length === 0) {
    console.error('No cover images found.');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(OG_DIR, { recursive: true });

  const meta = {};
  for (const file of sources) {
    const src = join(COVERS_DIR, file);
    const name = basename(file, extname(file));
    const cover = join(OUT_DIR, `${name}.webp`);
    const thumb = join(OUT_DIR, `${name}-thumb.webp`);
    const og = join(OG_DIR, `${name}.jpg`);

    // ">" only shrinks, never upscales
    magick([src, '-resize', '720x>', '-quality', '82', cover]);
    magick([src, '-resize', '112x>', '-quality', '80', thumb]);
    // Share cards: JPEG because some crawlers still skip WebP, and the
    // originals run to 6MB, past X's card image limit.
    magick([src, '-resize', '1200x>', '-background', 'white', '-flatten', '-strip', '-quality', '82', og]);

    const c = dims(cover);
    const t = dims(thumb);
    const o = dims(og);
    meta[name] = { width: c.w, height: c.h, thumbWidth: t.w, thumbHeight: t.h, ogWidth: o.w, ogHeight: o.h };
    console.log(`  ${file} -> webp ${c.w}x${c.h}, thumb ${t.w}x${t.h}, og ${o.w}x${o.h}`);
  }

  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(meta).length} entries to ${META_PATH}`);
}

main();
