const pool = require('../config/database');
const { success } = require('../utils/response');

function pageParams(query, defaultLimit = 20) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.per_page, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

function number(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const error = new Error(`${field} must be a number.`);
    error.statusCode = 422;
    throw error;
  }
  return parsed;
}

async function listCities(req, res) {
  const { limit, offset } = pageParams(req.query);
  const [rows] = await pool.execute(
    `SELECT id, name, slug, state, latitude, longitude, is_airport
     FROM cities WHERE is_active = 1 ORDER BY name LIMIT ? OFFSET ?`, [limit, offset]
  );
  return success(res, rows);
}

async function listRoutes(req, res) {
  const { limit, offset } = pageParams(req.query);
  const [rows] = await pool.execute(
    `SELECT r.id, r.slug, r.title, r.distance_km, r.duration_minutes, r.image_url,
      r.amount, r.is_popular, pc.name AS pickup_city, dc.name AS drop_city
     FROM routes r INNER JOIN cities pc ON pc.id = r.pickup_city_id
     INNER JOIN cities dc ON dc.id = r.drop_city_id
     WHERE r.is_active = 1 ORDER BY r.is_popular DESC, r.title LIMIT ? OFFSET ?`, [limit, offset]
  );
  return success(res, rows);
}

async function getRoute(req, res) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.slug, r.title, r.distance_km, r.duration_minutes, r.route_map_embed_url,
      r.content, r.faq_content, r.image_url, r.amount, pc.name AS pickup_city, dc.name AS drop_city
     FROM routes r INNER JOIN cities pc ON pc.id = r.pickup_city_id
     INNER JOIN cities dc ON dc.id = r.drop_city_id
     WHERE r.slug = ? AND r.is_active = 1 LIMIT 1`, [req.params.slug]
  );
  if (!rows[0]) { const error = new Error('Route not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function listVehicleCategories(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, seating_capacity, luggage_capacity, description, image_url,
      one_way_rate_per_km, round_trip_rate_per_km, driver_batta, minimum_km_per_day
     FROM vehicle_categories WHERE is_active = 1 ORDER BY display_order`
  );
  return success(res, rows);
}

async function listTariffs(req, res) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.vehicle_category_id, v.name AS vehicle_category, t.trip_type, t.route_id,
      t.rate_per_km, t.base_fare, t.driver_batta, t.minimum_km, t.minimum_fare,
      t.extra_km_rate, t.extra_hour_rate, t.night_charge, t.permit_charge, t.gst_percentage
     FROM tariff_plans t INNER JOIN vehicle_categories v ON v.id = t.vehicle_category_id
     WHERE t.is_active = 1 AND t.effective_from <= CURRENT_DATE
       AND (t.effective_to IS NULL OR t.effective_to >= CURRENT_DATE)
     ORDER BY v.display_order, t.trip_type`
  );
  return success(res, rows);
}

async function listFaqs(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, question, answer, category, related_type, route_id, cms_page_id
     FROM faqs WHERE is_active = 1 ORDER BY display_order, id`
  );
  return success(res, rows);
}

async function getCmsPage(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, title, slug, page_type, excerpt, content, banner_image_url, published_at
     FROM cms_pages WHERE slug = ? AND status = 'published' LIMIT 1`, [req.params.slug]
  );
  if (!rows[0]) { const error = new Error('Page not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function listBlog(req, res) {
  const { limit, offset } = pageParams(req.query, 10);
  const [rows] = await pool.execute(
    `SELECT id, title, slug, excerpt, featured_image_url, published_at
     FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`, [limit, offset]
  );
  return success(res, rows);
}

async function getBlog(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, title, slug, excerpt, content, featured_image_url, published_at
     FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`, [req.params.slug]
  );
  if (!rows[0]) { const error = new Error('Blog post not found.'); error.statusCode = 404; throw error; }
  return success(res, rows[0]);
}

async function listTestimonials(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, customer_name, rating, review, admin_reply, is_featured, created_at
     FROM testimonials WHERE approval_status = 'approved' ORDER BY is_featured DESC, created_at DESC`
  );
  return success(res, rows);
}

async function appConfig(req, res) {
  const [rows] = await pool.execute(
    `SELECT setting_key, setting_value, value_type FROM app_settings WHERE is_public = 1 ORDER BY id`
  );
  const data = {};
  for (const row of rows) {
    if (row.value_type === 'number') data[row.setting_key] = Number(row.setting_value);
    else if (row.value_type === 'boolean') data[row.setting_key] = row.setting_value === 'true';
    else if (row.value_type === 'json') data[row.setting_key] = JSON.parse(row.setting_value);
    else data[row.setting_key] = row.setting_value;
  }
  return success(res, data);
}

async function contact(req, res) {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !message) { const error = new Error('name and message are required.'); error.statusCode = 422; throw error; }
  const [result] = await pool.execute(
    'INSERT INTO contact_enquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
    [name, email || null, phone || null, subject || null, message]
  );
  return success(res, { id: result.insertId }, 'Enquiry submitted.', 201);
}

function haversineDistance(pickup, drop) {
  const radians = (value) => value * Math.PI / 180;
  const latDelta = radians(drop.latitude - pickup.latitude);
  const lngDelta = radians(drop.longitude - pickup.longitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(pickup.latitude)) * Math.cos(radians(drop.latitude)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function routeEstimate(req, res) {
  const input = req.method === 'GET' ? {
    pickup: { latitude: req.query.pickup_lat, longitude: req.query.pickup_lng },
    drop: { latitude: req.query.drop_lat, longitude: req.query.drop_lng }
  } : req.body;
  const pickup = { latitude: number(input.pickup?.latitude, 'pickup latitude'), longitude: number(input.pickup?.longitude, 'pickup longitude') };
  const drop = { latitude: number(input.drop?.latitude, 'drop latitude'), longitude: number(input.drop?.longitude, 'drop longitude') };
  if (Math.abs(pickup.latitude) > 90 || Math.abs(drop.latitude) > 90 || Math.abs(pickup.longitude) > 180 || Math.abs(drop.longitude) > 180) {
    const error = new Error('Coordinates are out of range.'); error.statusCode = 422; throw error;
  }
  const distance = Number(haversineDistance(pickup, drop).toFixed(2));
  return success(res, { distance_km: distance, duration_minutes: Math.max(1, Math.round(distance * 2.2)), provider: 'haversine' });
}

async function createGuestBooking(req, res) {
  const requiredFields = ['vehicle_category_id', 'trip_type', 'customer_name', 'customer_phone', 'pickup_location', 'drop_location', 'pickup_at'];
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      const error = new Error(`${field} is required.`); error.statusCode = 422; throw error;
    }
  }
  const vehicleCategoryId = Number(req.body.vehicle_category_id);
  if (!Number.isInteger(vehicleCategoryId) || vehicleCategoryId < 1) {
    const error = new Error('vehicle_category_id must be a positive integer.'); error.statusCode = 422; throw error;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [categories] = await connection.execute(
      `SELECT id, one_way_rate_per_km, round_trip_rate_per_km, driver_batta
       FROM vehicle_categories WHERE id = ? AND is_active = 1 LIMIT 1`, [vehicleCategoryId]
    );
    if (!categories[0]) { const error = new Error('Vehicle category not found.'); error.statusCode = 404; throw error; }

    let route = null;
    if (req.body.route_id !== undefined && req.body.route_id !== null && req.body.route_id !== '') {
      const [routes] = await connection.execute('SELECT id, distance_km, duration_minutes FROM routes WHERE id = ? AND is_active = 1 LIMIT 1', [Number(req.body.route_id)]);
      route = routes[0];
      if (!route) { const error = new Error('Route not found.'); error.statusCode = 404; throw error; }
    }
    const category = categories[0];
    const distance = Number(req.body.estimated_distance_km || route?.distance_km || 0);
    const rate = req.body.trip_type === 'round_trip' ? Number(category.round_trip_rate_per_km) : Number(category.one_way_rate_per_km);
    const baseFare = Number((distance * rate + Number(category.driver_batta)).toFixed(2));
    const reference = `CAB${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.slice(0, 30);
    const [result] = await connection.execute(
      `INSERT INTO bookings (booking_reference, vehicle_category_id, route_id, trip_type, booking_source,
       customer_name, customer_phone, customer_email, pickup_location, drop_location, pickup_city, drop_city,
       pickup_at, return_at, passenger_count, special_note, estimated_distance_km, estimated_duration_minutes,
       rate_per_km, driver_batta, base_fare, estimated_total)
       VALUES (?, ?, ?, ?, 'website', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reference, vehicleCategoryId, route?.id || null, req.body.trip_type, req.body.customer_name, req.body.customer_phone,
        req.body.customer_email || null, req.body.pickup_location, req.body.drop_location, req.body.pickup_city || null,
        req.body.drop_city || null, new Date(req.body.pickup_at), req.body.return_at ? new Date(req.body.return_at) : null,
        req.body.passenger_count || null, req.body.special_note || null, distance, route?.duration_minutes || null,
        rate, Number(category.driver_batta), baseFare, baseFare]
    );
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, new_status, changed_by_type, note)
       VALUES (?, 'pending', 'system', 'Guest booking created')`, [result.insertId]
    );
    await connection.commit();
    return success(res, { id: result.insertId, booking_reference: reference, estimated_total: baseFare, status: 'pending' }, 'Booking created.', 201);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listCities, listRoutes, getRoute, listVehicleCategories, listTariffs, listFaqs, getCmsPage, listBlog, getBlog, listTestimonials, appConfig, contact, routeEstimate, createGuestBooking };