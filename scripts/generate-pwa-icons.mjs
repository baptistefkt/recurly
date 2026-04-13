/**
 * Regenerates PWA / favicon / social preview PNGs from design/recurly-logo.png (square, ≥512px).
 * Run: npm run generate:icons
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pub = path.join(root, "public");
const src = path.join(root, "design", "recurly-logo.png");
const black = { r: 0, g: 0, b: 0, alpha: 1 };

const pngOut = { compressionLevel: 9, adaptiveFiltering: true };

async function main() {
  const base = sharp(src).png(pngOut);

  await base.clone().resize(32, 32).toFile(path.join(pub, "icon-32.png"));
  await base.clone().resize(192, 192).toFile(path.join(pub, "icon-192.png"));
  await base.clone().resize(512, 512).toFile(path.join(pub, "icon-512.png"));
  await base.clone().resize(512, 512).toFile(path.join(pub, "icon.png"));
  await base.clone().resize(180, 180).toFile(path.join(pub, "apple-touch-icon.png"));

  const inner = 410;
  const pad = Math.floor((512 - inner) / 2);
  const fg = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: black },
  })
    .composite([{ input: fg, left: pad, top: pad }])
    .png(pngOut)
    .toFile(path.join(pub, "icon-maskable-512.png"));

  const ogW = 1200;
  const ogH = 630;
  const logoMaxW = Math.round(ogW * 0.72);
  const logoMaxH = Math.round(ogH * 0.72);
  const logoBuf = await sharp(src)
    .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(logoBuf).metadata();
  const lw = meta.width ?? 0;
  const lh = meta.height ?? 0;
  const lx = Math.round((ogW - lw) / 2);
  const ly = Math.round((ogH - lh) / 2);
  await sharp({
    create: { width: ogW, height: ogH, channels: 3, background: black },
  })
    .composite([{ input: logoBuf, left: lx, top: ly }])
    .png(pngOut)
    .toFile(path.join(pub, "og-preview.png"));

  console.log(
    "Wrote icon-32.png, icon-192.png, icon-512.png, icon.png, apple-touch-icon.png, icon-maskable-512.png, og-preview.png"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
