/**
 * WhatsApp/Facebook do not run JS. Force Open Graph tags into the static SPA shell.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const origin = "https://yaazhcabs.in";
const image = `${origin}/og-cover.jpg`;
const start = "<!-- yaazh-og -->";
const end = "<!-- /yaazh-og -->";
const block = `${start}
<meta charset="utf-8" />
<meta property="og:title" content="Yaazh Cabs | Premium Taxi Service in Udumalpet" />
<meta property="og:description" content="Comfortable rides, reliable service, best prices. Book a cab 24×7." />
<meta property="og:type" content="website" />
<meta property="og:url" content="${origin}/" />
<meta property="og:site_name" content="Yaazh Cabs" />
<meta property="og:image" content="${image}" />
<meta property="og:image:secure_url" content="${image}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Yaazh Cabs — taxi in Udumalpet" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Yaazh Cabs | Premium Taxi Service in Udumalpet" />
<meta name="twitter:description" content="Comfortable rides, reliable service, best prices. Book a cab 24×7." />
<meta name="twitter:image" content="${image}" />
<link rel="image_src" href="${image}" />
${end}`;

const files = [".output/public/_shell.html", ".output/public/index.html"];
const strip = /<!-- yaazh-og -->[\s\S]*?<!-- \/yaazh-og -->\s*/g;

for (const file of files) {
  if (!existsSync(file)) {
    if (file.endsWith("_shell.html")) {
      console.error(`Missing ${file} — SPA shell was not built.`);
      process.exit(1);
    }
    continue;
  }

  let html = readFileSync(file, "utf8");
  html = html.replace(strip, "");
  if (!/<head[^>]*>/i.test(html)) {
    console.error(`${file} has no <head> — cannot inject Open Graph tags.`);
    process.exit(1);
  }
  html = html.replace(/<head[^>]*>/i, (open) => `${open}\n${block}\n`);
  writeFileSync(file, html);
  if (!html.includes('property="og:image"') || !html.includes("og-cover.jpg")) {
    console.error(`${file} is missing og:image after inject.`);
    process.exit(1);
  }
  console.log(`Injected Open Graph tags into ${file}`);
}

if (!existsSync(".output/public/og-cover.jpg")) {
  console.error("Missing .output/public/og-cover.jpg — share image will not work.");
  process.exit(1);
}
