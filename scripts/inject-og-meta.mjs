/**
 * WhatsApp/Facebook do not run JS. Force Open Graph tags into the static SPA shell.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "vite";

const origin = "https://yaazhcabsudumalpet.in";
const image = `${origin}/og-cover.jpg`;
const gtmContainerId = loadEnv("production", process.cwd(), "VITE_").VITE_GTM_CONTAINER_ID?.trim();
const start = "<!-- yaazh-og -->";
const end = "<!-- /yaazh-og -->";
const block = `${start}
<meta charset="utf-8" />
<meta name="description" content="Book Yaazh Cabs in Udumalpet for local rides, Coimbatore Airport transfers, one-way trips, outstation travel and car booking across Tamil Nadu." />
<meta name="robots" content="index, follow" />
<meta name="author" content="Yaazh Cabs" />
<link rel="canonical" href="${origin}/" />
<meta property="og:title" content="Yaazh Cabs | Car Booking and Taxi Service in Udumalpet" />
<meta property="og:description" content="Book reliable cars from Udumalpet for airport transfers, one-way trips, outstation travel and local rides." />
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
<meta name="twitter:title" content="Yaazh Cabs | Car Booking and Taxi Service in Udumalpet" />
<meta name="twitter:description" content="Book reliable cars from Udumalpet for airport transfers, one-way trips, outstation travel and local rides." />
<meta name="twitter:image" content="${image}" />
<link rel="image_src" href="${image}" />
${end}`;
const gtmHeadBlock = gtmContainerId
  ? `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmContainerId}');</script>
<!-- End Google Tag Manager -->`
  : "";
const gtmBodyBlock = gtmContainerId
  ? `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmContainerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`
  : "";

const files = ["dist/index.html"];
const strip = /<!-- yaazh-og -->[\s\S]*?<!-- \/yaazh-og -->\s*/g;

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`Missing ${file} — frontend build was not created.`);
    process.exit(1);
  }

  let html = readFileSync(file, "utf8");
  html = html.replace(strip, "");
  html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->\s*/g, "");
  html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->\s*/g, "");
  if (!/<head[^>]*>/i.test(html)) {
    console.error(`${file} has no <head> — cannot inject Open Graph tags.`);
    process.exit(1);
  }
  html = html.replace(/<head[^>]*>/i, (open) => `${open}\n${block}\n`);
  if (gtmHeadBlock) html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, (head) => head.replace(/<\/head>/i, `${gtmHeadBlock}\n</head>`));
  if (gtmBodyBlock) html = html.replace(/<body[^>]*>/i, (open) => `${open}\n${gtmBodyBlock}`);
  writeFileSync(file, html);
  if (!html.includes('property="og:image"') || !html.includes("og-cover.jpg")) {
    console.error(`${file} is missing og:image after inject.`);
    process.exit(1);
  }
  console.log(`Injected Open Graph tags into ${file}`);
}

if (!existsSync("dist/og-cover.jpg")) {
  console.error("Missing dist/og-cover.jpg — share image will not work.");
  process.exit(1);
}
