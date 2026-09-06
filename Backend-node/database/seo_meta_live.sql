-- Idempotent live SEO metadata for https://yaazhcabsudumalpet.in/
-- Run after the seo_meta table exists.

UPDATE seo_meta
SET meta_title = 'Yaazh Cabs - Taxi in Udumalpet - Airport and Outstation Cabs',
    meta_description = 'Book reliable taxis in Udumalpet for Coimbatore Airport, Ooty, Kodaikanal, one-way and round trips. Yaazh Cabs offers clean cars, experienced drivers and 24x7 booking support.',
    canonical_url = 'https://yaazhcabsudumalpet.in/',
    og_title = 'Yaazh Cabs - Taxi in Udumalpet - Airport and Outstation Cabs',
    og_description = 'Book reliable taxis in Udumalpet for Coimbatore Airport, Ooty, Kodaikanal, one-way and round trips.',
    og_image_url = 'https://yaazhcabsudumalpet.in/og-cover.jpg',
    schema_json = '{"@context":"https://schema.org","@type":"TaxiService","name":"Yaazh Cabs","url":"https://yaazhcabsudumalpet.in/","areaServed":"Udumalpet, Tamil Nadu","telephone":"+919360055761","address":{"@type":"PostalAddress","addressLocality":"Udumalpet","addressRegion":"Tamil Nadu","postalCode":"642126","addressCountry":"IN"},"geo":{"@type":"GeoCoordinates","latitude":10.551642,"longitude":77.306707}}',
    robots_index = 1,
    robots_follow = 1
WHERE entity_type = 'home' AND entity_id IS NULL AND url_path = '/';

INSERT INTO seo_meta (
  entity_type, entity_id, url_path, meta_title, meta_description, canonical_url,
  og_title, og_description, og_image_url, schema_json, robots_index, robots_follow
)
SELECT
  'home', NULL, '/',
  'Yaazh Cabs - Taxi in Udumalpet - Airport and Outstation Cabs',
  'Book reliable taxis in Udumalpet for Coimbatore Airport, Ooty, Kodaikanal, one-way and round trips. Yaazh Cabs offers clean cars, experienced drivers and 24x7 booking support.',
  'https://yaazhcabsudumalpet.in/',
  'Yaazh Cabs - Taxi in Udumalpet - Airport and Outstation Cabs',
  'Book reliable taxis in Udumalpet for Coimbatore Airport, Ooty, Kodaikanal, one-way and round trips.',
  'https://yaazhcabsudumalpet.in/og-cover.jpg',
  '{"@context":"https://schema.org","@type":"TaxiService","name":"Yaazh Cabs","url":"https://yaazhcabsudumalpet.in/","areaServed":"Udumalpet, Tamil Nadu","telephone":"+919360055761","address":{"@type":"PostalAddress","addressLocality":"Udumalpet","addressRegion":"Tamil Nadu","postalCode":"642126","addressCountry":"IN"},"geo":{"@type":"GeoCoordinates","latitude":10.551642,"longitude":77.306707}}',
  1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM seo_meta WHERE entity_type = 'home' AND entity_id IS NULL AND url_path = '/'
);
