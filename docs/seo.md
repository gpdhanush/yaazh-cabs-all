# Yaazh Cabs public website — SEO

Customer site: [https://yaazhcabs.in](https://yaazhcabs.in)  
This note is an audit of the current public site plus a step-by-step plan (Search Console, Analytics, local SEO, landing pages).

---

## Implemented in the repo

- GA4 loader when `VITE_GA_MEASUREMENT_ID` is set ([`src/lib/analytics.ts`](../src/lib/analytics.ts), [`src/routes/__root.tsx`](../src/routes/__root.tsx)). Events: `generate_lead` (booking + enquiry), `click_to_call`, `whatsapp_click`.
- Search Console meta when `VITE_GOOGLE_SITE_VERIFICATION` is set.
- Share image: [`public/og-cover.png`](../public/og-cover.png) (`og:image` / `twitter:image`).
- Static sitemap: [`public/sitemap.xml`](../public/sitemap.xml) (works on cPanel SPA). Env: see [`.env.example`](../.env.example). Rebuild after setting `VITE_*`.

---

## What is already in good shape

- Home meta in [`src/routes/index.tsx`](../src/routes/index.tsx): title, description, `og:url`, canonical `https://yaazhcabs.in/`.
- Track-booking meta in [`src/routes/status.tsx`](../src/routes/status.tsx).
- Feedback pages are `noindex, nofollow` (correct).
- [`public/robots.txt`](../public/robots.txt) allows crawlers and points at the sitemap.
- [`src/routes/sitemap[.]xml.ts`](../src/routes/sitemap%5B.%5Dxml.ts) serves `/` and `/status`.
- JSON-LD: `TaxiService` + `FAQPage`.
- Semantic sections with `<h2>`s; fleet and route images have useful `alt` text.
- Root HTML uses `lang="en"`.

---

## Gaps that hold Google back

- No Google Search Console or Google Analytics 4.
- No `og:image` / `twitter:image` (WhatsApp and Facebook shares look empty).
- Almost no extra indexable URLs (one SPA homepage; hashes like `#routes` do not rank).
- No conversion events (booking, call, WhatsApp).
- FAQ JSON-LD uses fallback copy, not the live API FAQ list.
- On static cPanel, `/sitemap.xml` may 404 if the TanStack server route is not deployed — confirm live.

---

## Point-by-point process

### 1. Google Search Console (do this first)

1. Open [Google Search Console](https://search.google.com/search-console) → Add property `https://yaazhcabs.in`.
2. Also add `https://www.yaazhcabs.in` if that host exists. Keep **one** canonical host (the site already uses non-www).
3. Verify with a DNS TXT record **or** HTML meta `google-site-verification` in [`src/routes/__root.tsx`](../src/routes/__root.tsx).
4. Submit `https://yaazhcabs.in/sitemap.xml`.
5. Request indexing for `/`.
6. In cPanel `.htaccess`, 301 `www` and `http` to `https://yaazhcabs.in`.

### 2. Google Analytics 4

1. Create a GA4 property (not Universal Analytics).
2. Store the Measurement ID (`G-XXXXXXXX`) in env, e.g. `VITE_GA_MEASUREMENT_ID`.
3. Load `gtag.js` only in production, from the root shell (add a cookie banner if you need consent).
4. Events to send:
   - `page_view`
   - `generate_lead` — booking form submit
   - `contact` — enquiry form
   - `click_to_call`
   - `whatsapp_click`
5. Optional: Google Tag Manager instead of raw gtag if you later add Ads / Meta pixels without rebuilding.

### 3. Google Business Profile (local SEO)

1. Claim **Yaazh Cabs, Udumalpet**.
2. Match NAP everywhere: business name, address, phones (including `93600 55761`), hours, website.
3. Categories: Taxi service, Airport shuttle.
4. Upload car and office photos; post weekly; ask riders for Google reviews.

### 4. Social / share image (missing today)

1. Add a 1200×630 image, e.g. `public/og-cover.jpg`.
2. Set `og:image` and `twitter:image` to the absolute URL `https://yaazhcabs.in/og-cover.jpg` on home and `/status`.
3. Root meta currently has **no** `og:image`.

### 5. Strengthen structured data

1. Extend `TaxiService` with `openingHours`, `priceRange`, `image`, `sameAs` (Instagram / Facebook), and `aggregateRating` only if reviews are real.
2. Keep a single local type (TaxiService). Do not emit conflicting duplicate businesses.
3. Build FAQ JSON-LD from the same list users see (API + fallback), not only [`FALLBACK_FAQS`](../src/components/site/faq.tsx).
4. Add `BreadcrumbList` when inner pages exist.

### 6. Headings and keywords

1. Visible `<h1>` is “Travel safe / Reach happy” (brand, weak for search). Keep the animation; include an accessible line such as *Taxi in Udumalpet — airport, one-way, outstation*.
2. Keep one H1 per page.
3. Keep H2s like Our services, The fleet, Reach us in Udumalpet.

### 7. More indexable URLs (biggest organic gap)

Google cannot rank “Udumalpet to Ooty taxi” from `#routes`. Add real routes, for example:

- `/routes/udumalpet-to-coimbatore`
- `/routes/udumalpet-to-ooty`
- `/airport-taxi-coimbatore`

Each page needs a unique title, description, H1, 300–500 words, a book CTA, and a sitemap row. Lower `/status` sitemap priority (utility, not a money page).

### 8. Technical crawl (cPanel SPA)

1. Confirm `.htaccess` serves `index.html` for unknown paths **and** still exposes `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`.
2. The TypeScript sitemap is a **server route**. On **static cPanel**, check `https://yaazhcabs.in/sitemap.xml`. If it 404s, add a static [`public/sitemap.xml`](../public/sitemap.xml) before the next deploy.
3. Rebuild after any `VITE_*` change ([`docs/cpanel-deploy.md`](cpanel-deploy.md)).

### 9. Performance (Core Web Vitals)

1. Compress hero / fleet / gallery; prefer WebP.
2. Lazy-load below-fold images.
3. Subset or self-host Inter (`preconnect` is already in the root head).
4. Keep `prefers-reduced-motion`; do not load the scroll-journey rail on small screens.
5. Run [PageSpeed Insights](https://pagespeed.web.dev/) on `yaazhcabs.in` and fix LCP (hero image) first.

### 10. Images and accessibility

1. Avoid empty `alt` on marketing photos. Decorative icons next to a visible title can stay `alt=""`.
2. Prefer filenames like `udumalpet-airport-taxi.webp`.

### 11. On-page content

1. Unique copy with city + service words: Udumalpet, Coimbatore airport, Ooty, Kodaikanal, one-way taxi.
2. Footer: full address, phones, and email as text (not only icons).
3. Internal links: “Airport taxi” → `#services` for now; later `/airport-taxi-coimbatore`.

### 12. Off-page

1. Citations: Justdial, Sulekha, IndiaMART with the same NAP.
2. Hotels and travel desks in Udumalpet.
3. Do not buy spammy backlinks.

### 13. Measure weekly

- Search Console: queries, impressions, coverage errors.
- GA4: sessions, booking events, top cities.
- Target queries: `taxi in udumalpet`, `udumalpet to coimbatore cab`, `coimbatore airport taxi from udumalpet`.

---

## Suggested order (first 2 weeks)

1. Search Console + 301 www → apex + confirm sitemap live.
2. GA4 + booking / call / WhatsApp events.
3. `og:image`.
4. Google Business Profile.
5. Static sitemap if cPanel does not run the TS sitemap route.
6. Landing pages for the top 5 routes.

---

## Code touchpoints

| Item | Location |
|------|----------|
| Home title / description / JSON-LD | `src/routes/index.tsx` |
| Default head, fonts, favicon | `src/routes/__root.tsx` |
| Robots | `public/robots.txt` |
| Sitemap (server) | `src/routes/sitemap[.]xml.ts` |
| FAQ schema | `src/components/site/faq.tsx` |
| Deploy | [`docs/cpanel-deploy.md`](cpanel-deploy.md) |
