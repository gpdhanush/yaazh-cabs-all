# Yaazh Cabs public website — SEO

Customer site: [https://yaazhcabsudumalpet.in](https://yaazhcabsudumalpet.in)
This note is an audit of the current public site plus a step-by-step plan (Search Console, Analytics, local SEO, landing pages).

---

## Implemented in the repo

- GA4 loader when `VITE_GA_MEASUREMENT_ID` is set ([`src/lib/analytics.ts`](../src/lib/analytics.ts), [`src/routes/__root.tsx`](../src/routes/__root.tsx)). Events: `generate_lead` (booking + enquiry), `click_to_call`, `whatsapp_click`.
- Optional Google Tag Manager loader when `VITE_GTM_CONTAINER_ID` is set. Events are also pushed to `dataLayer` for GTM triggers.
- Search Console meta when `VITE_GOOGLE_SITE_VERIFICATION` is set.
- Share image: [`public/og-cover.jpg`](../public/og-cover.jpg) (`og:image` / `twitter:image`, 1200×630 JPEG).
- Static sitemap: [`public/sitemap.xml`](../public/sitemap.xml) (works on cPanel SPA). Env: see [`.env.example`](../.env.example). Rebuild after setting `VITE_*`.

## Recommended SEO Content

Use this copy as the canonical website content for the home page and Google Business Profile. Keep the business name and location consistent across the site, directory listings, and structured data.

| Field | Recommended content |
|------|---------------------|
| Page title | Yaazh Cabs - Taxi in Udumalpet - Airport and Outstation Cabs |
| Meta description | Book reliable taxis in Udumalpet for Coimbatore Airport, Ooty, Kodaikanal, one-way and round trips. Yaazh Cabs offers clean cars, experienced drivers and 24x7 booking support. |
| H1 | Taxi in Udumalpet for Airport, One-Way and Outstation Travel |
| Intro copy | Yaazh Cabs provides dependable taxi service from Udumalpet for local rides, Coimbatore Airport transfers, one-way trips, round trips and outstation travel across Tamil Nadu. Choose a comfortable car, get clear fare guidance and travel with an experienced driver. |
| Primary CTA | Book a taxi from Udumalpet |
| Service keywords | taxi in Udumalpet, Udumalpet to Coimbatore taxi, Coimbatore Airport taxi from Udumalpet, Udumalpet to Ooty cab, one-way taxi, outstation cab |
| Image alt pattern | `Yaazh Cabs {vehicle/service} taxi in Udumalpet` |

Avoid keyword stuffing. Each future route page should use its own title, description, H1 and 300-500 words of useful local travel information.

## Backend SEO Settings Check

Run these checks against the production database after deployment. The public API reads only `app_settings` rows where `is_public = 1`; `seo_meta` is available in the schema for page-level metadata but is not currently exposed by a Backend-node admin route.

| Check | Table/key or endpoint | Expected value/status |
|------|----------------------|------------------------|
| Business name | `app_settings.company_name` | `Yaazh Cabs` |
| Support phone | `app_settings.support_phone` | `9360055761` |
| Support email | `app_settings.support_email` | `hello@yaazhcabs.in` |
| Business address | `app_settings.business_address` | Includes `Udumalpet` and `Tamil Nadu 642126` |
| Business hours | `app_settings.business_hours` | `Open 24x7` |
| Map coordinates | `app_settings.map_lat`, `app_settings.map_lng` | `10.551642`, `77.306707` |
| Public config | `GET /api/v1/public/app-config?app=user_website&platform=web` | Returns public settings without a 5xx or CORS error |
| Home metadata | `seo_meta.url_path = '/'` | `robots_index = 1`, `robots_follow = 1`, canonical uses `https://yaazhcabsudumalpet.in/` |
| Route metadata | `seo_meta.entity_type = 'route'` | Each published route has a unique title, description and canonical URL |
| Sitemap | `/sitemap.xml` | HTTP 200 and contains canonical public URLs only |
| Robots | `/robots.txt` | HTTP 200 and points to `/sitemap.xml` |

Useful SQL checks:

```sql
SELECT setting_key, setting_value, is_public
FROM app_settings
WHERE setting_key IN (
   'company_name', 'support_phone', 'support_email', 'business_address',
   'business_hours', 'map_lat', 'map_lng'
)
ORDER BY setting_key;

SELECT entity_type, url_path, meta_title, meta_description, canonical_url,
          robots_index, robots_follow
FROM seo_meta
ORDER BY url_path;
```

For settings that are already present, update them through the authenticated admin endpoint rather than inserting duplicates:

```http
PUT /api/v1/admin/settings/{setting_key}
Content-Type: application/json

{"value":"..."}
```

---

## What is already in good shape

- Home meta in [`src/routes/index.tsx`](../src/routes/index.tsx): title, description, `og:url`, canonical `https://yaazhcabsudumalpet.in/`.
- Track-booking meta in [`src/routes/status.tsx`](../src/routes/status.tsx).
- Feedback pages are `noindex, nofollow` (correct).
- [`public/robots.txt`](../public/robots.txt) allows crawlers and points at the sitemap.
- [`src/routes/sitemap[.]xml.ts`](../src/routes/sitemap%5B.%5Dxml.ts) serves `/` and `/status`.
- JSON-LD: `TaxiService` + `FAQPage`.
- Semantic sections with `<h2>`s; fleet and route images have useful `alt` text.
- Root HTML uses `lang="en"`.

---

## Gaps that hold Google back

- Google Analytics 4 is integrated when `VITE_GA_MEASUREMENT_ID` is set. The current production ID is configured in `.env`.
- Google Search Console verification is still pending until `VITE_GOOGLE_SITE_VERIFICATION` is filled with Google's token.
- `og:image` / `twitter:image` are configured from `public/og-cover.jpg`.
- Almost no extra indexable URLs (one SPA homepage; hashes like `#routes` do not rank).
- Conversion and engagement events are available: `generate_lead` for booking/enquiry submissions, `click_to_call`, and `whatsapp_click`.
- FAQ JSON-LD uses fallback copy, not the live API FAQ list.
- On static cPanel, `/sitemap.xml` may 404 if the TanStack server route is not deployed — confirm live.

---

## Point-by-point process

### 1. Google Search Console (do this first)

1. Open [Google Search Console](https://search.google.com/search-console) → Add property `https://yaazhcabsudumalpet.in`.
3. Verify with a DNS TXT record **or** HTML meta `google-site-verification` in [`src/routes/__root.tsx`](../src/routes/__root.tsx).
4. Submit `https://yaazhcabsudumalpet.in/sitemap.xml`.
5. Request indexing for `/`.
6. In cPanel `.htaccess`, 301 `www` and `http` to `https://yaazhcabsudumalpet.in`.

### 2. Google Analytics 4

1. Create a GA4 property (not Universal Analytics) and a Web data stream for `https://yaazhcabsudumalpet.in`.
2. Either put the Measurement ID (`G-XXXXXXXX`) in `VITE_GA_MEASUREMENT_ID`, or manage GA4 through GTM. Do not configure both for the same site because events can be counted twice.
3. For GTM, create a Web container, put its ID (`GTM-XXXXXXX`) in `VITE_GTM_CONTAINER_ID`, create a GA4 Configuration tag using `G-ZX9NKJ2WGZ`, and publish the container.
4. Run `npm run build:cpanel` and deploy the resulting `dist/` directory after changing environment values.
5. The public site sends `page_view`, `generate_lead` (booking and enquiry), `click_to_call`, and `whatsapp_click` to GTM's `dataLayer`.
6. In GA4, open **Reports → Realtime** while testing. Use **Admin → Events** to mark `generate_lead`, `click_to_call`, and `whatsapp_click` as key events if they represent business conversions.

### 3. Google Tag Manager setup

1. Open [Google Tag Manager](https://tagmanager.google.com/) and create a Web container for `yaazhcabsudumalpet.in`.
2. Add `VITE_GTM_CONTAINER_ID=GTM-XXXXXXX` to the production environment and rebuild the site.
3. In GTM, create a **Google tag** with your GA4 Measurement ID and trigger it on **Initialization - All pages**.
4. For conversion events, create Custom Event triggers named `generate_lead`, `click_to_call`, and `whatsapp_click`, then add GA4 Event tags using the matching event name.
5. Select **Preview** in GTM, enter the live site URL, and confirm the events appear in Tag Assistant.
6. Submit the container with **Publish**. Preview mode alone does not publish changes.
5. Optional: Google Tag Manager instead of raw gtag if you later add Ads / Meta pixels without rebuilding.

### 3. Google Business Profile (local SEO)

1. Claim **Yaazh Cabs, Udumalpet**.
2. Match NAP everywhere: business name, address, phones (including `93600 55761`), hours, website.
3. Categories: Taxi service, Airport shuttle.
4. Upload car and office photos; post weekly; ask riders for Google reviews.

### 4. Social / share image (missing today)

1. Add a 1200×630 image, e.g. `public/og-cover.jpg`.
2. Set `og:image` and `twitter:image` to the absolute URL `https://yaazhcabsudumalpet.in/og-cover.jpg` on home and `/status`.
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
2. The TypeScript sitemap is a **server route**. On **static cPanel**, check `https://yaazhcabsudumalpet.in/sitemap.xml`. If it 404s, add a static [`public/sitemap.xml`](../public/sitemap.xml) before the next deploy.
3. Rebuild after any `VITE_*` change ([`docs/cpanel-deploy.md`](cpanel-deploy.md)).

### 9. Performance (Core Web Vitals)

1. Compress hero / fleet / gallery; prefer WebP.
2. Lazy-load below-fold images.
3. Subset or self-host Inter (`preconnect` is already in the root head).
4. Keep `prefers-reduced-motion`; do not load the scroll-journey rail on small screens.
5. Run [PageSpeed Insights](https://pagespeed.web.dev/) on `yaazhcabsudumalpet.in` and fix LCP (hero image) first.

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
