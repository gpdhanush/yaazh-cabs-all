const pool = require('../config/database');
const { success } = require('../utils/response');
const crypto = require('crypto');

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

function mysqlDateTime(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${field} must be a valid date.`);
    error.statusCode = 422;
    throw error;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

async function findOrCreateWebsiteCustomer(connection, { name, phone, email }) {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 8) {
    const error = new Error('customer_phone must contain at least 8 digits.');
    error.statusCode = 422;
    throw error;
  }

  await connection.execute(
    `INSERT INTO customers (name, email, phone)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [String(name).trim(), email ? String(email).trim() : null, normalizedPhone]
  );
  const [customers] = await connection.execute(
    'SELECT id FROM customers WHERE phone = ? LIMIT 1',
    [normalizedPhone]
  );
  if (!customers[0]) {
    const error = new Error('Unable to create customer profile.');
    error.statusCode = 500;
    throw error;
  }
  return { id: Number(customers[0].id), phone: normalizedPhone };
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
  return success(res, rows.map((row) => ({ ...row, from: row.pickup_city, to: row.drop_city, starting_fare: row.amount, tag: row.is_popular ? 'Popular' : null })));
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
  const settings = {};
  for (const row of rows) {
    settings[row.setting_key] = parsePublicValue(row.setting_value, row.value_type);
  }
  const [remoteRows] = await pool.execute(
    `SELECT config_key, config_value, value_type FROM remote_config_values
     WHERE is_active = 1 AND (app_type IN ('all', 'user_website') OR app_type = ?) AND (platform IN ('all', 'web') OR platform = ?)
     ORDER BY id`, [req.query.app || 'user_website', req.query.platform || 'web']
  );
  const remote_config = {};
  for (const row of remoteRows) remote_config[row.config_key] = parsePublicValue(row.config_value, row.value_type);
  return success(res, { settings, remote_config });
}

function parsePublicValue(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
  if (type === 'json') {
    try { return value == null || value === '' ? null : JSON.parse(value); } catch (_error) { return value; }
  }
  return value;
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

async function fareEstimate(req, res) {
  const vehicleCategoryId = Number(req.body.vehicle_category_id);
  if (!Number.isInteger(vehicleCategoryId) || vehicleCategoryId < 1 || !req.body.trip_type) { const error = new Error('vehicle_category_id and trip_type are required.'); error.statusCode = 422; throw error; }
  const [categories] = await pool.execute('SELECT * FROM vehicle_categories WHERE id = ? AND is_active = 1 LIMIT 1', [vehicleCategoryId]);
  if (!categories[0]) { const error = new Error('Vehicle category not found.'); error.statusCode = 404; throw error; }
  let distance = Number(req.body.distance_km || 0);
  let duration = null;
  let routeId = req.body.route_id == null || req.body.route_id === '' ? null : Number(req.body.route_id);
  if (routeId) {
    const [routes] = await pool.execute('SELECT distance_km, duration_minutes FROM routes WHERE id = ? AND is_active = 1 LIMIT 1', [routeId]);
    if (!routes[0]) { const error = new Error('Route not found.'); error.statusCode = 404; throw error; }
    distance = distance || Number(routes[0].distance_km);
    duration = routes[0].duration_minutes;
  }
  if (!distance && req.body.pickup_latitude != null && req.body.drop_latitude != null) {
    const estimate = haversineDistance({ latitude: number(req.body.pickup_latitude, 'pickup_latitude'), longitude: number(req.body.pickup_longitude, 'pickup_longitude') }, { latitude: number(req.body.drop_latitude, 'drop_latitude'), longitude: number(req.body.drop_longitude, 'drop_longitude') });
    distance = Number(estimate.toFixed(2));
    duration = Math.max(1, Math.round(distance * 2.2));
  }
  if (!Number.isFinite(distance) || distance <= 0) { const error = new Error('distance_km or valid coordinates are required.'); error.statusCode = 422; throw error; }
  const category = categories[0];
  const [tariffs] = await pool.execute('SELECT * FROM tariff_plans WHERE vehicle_category_id = ? AND trip_type = ? AND (route_id = ? OR route_id IS NULL) AND is_active = 1 AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE) ORDER BY route_id IS NULL, id DESC LIMIT 1', [vehicleCategoryId, req.body.trip_type, routeId]);
  const tariff = tariffs[0];
  const rate = tariff ? Number(tariff.rate_per_km) : (req.body.trip_type === 'round_trip' ? Number(category.round_trip_rate_per_km) : Number(category.one_way_rate_per_km));
  const baseFare = tariff ? Number(tariff.base_fare) : 0;
  const driverBatta = tariff ? Number(tariff.driver_batta) : Number(category.driver_batta);
  const minimumFare = tariff ? Number(tariff.minimum_fare) : 0;
  const distanceFare = distance * rate;
  const subtotal = Math.max(minimumFare, baseFare + distanceFare + driverBatta);
  const gstPercentage = tariff ? Number(tariff.gst_percentage) : 0;
  const gstAmount = subtotal * gstPercentage / 100;
  return success(res, { vehicle_category_id: String(vehicleCategoryId), route_id: routeId == null ? null : String(routeId), distance_km: distance, duration_minutes: duration, provider: 'database', rate_per_km: rate, base_fare: baseFare, driver_batta: driverBatta, minimum_fare: minimumFare, distance_fare: Number(distanceFare.toFixed(2)), gst_percentage: gstPercentage, gst_amount: Number(gstAmount.toFixed(2)), discount_amount: 0, subtotal: Number(subtotal.toFixed(2)), estimated_total: Number((subtotal + gstAmount).toFixed(2)) });
}

async function trackBooking(req, res) {
  const reference = String(req.body.booking_reference || '').trim();
  const phone = String(req.body.customer_phone || '').replace(/\D/g, '');
  if (!reference && phone.length < 8) { const error = new Error('Enter booking reference or mobile number.'); error.statusCode = 422; throw error; }
  const where = reference ? 'b.booking_reference = ?' : 'REPLACE(REPLACE(b.customer_phone, \'-\', \'\'), \' \', \'\') = ?';
  const value = reference || phone;
  const [rows] = await pool.execute(`SELECT b.*, d.id AS driver_id, d.name AS driver_name, d.phone AS driver_phone, d.profile_image_url AS driver_photo, v.vehicle_name, v.registration_no FROM bookings b LEFT JOIN drivers d ON d.id = b.assigned_driver_id LEFT JOIN vehicles v ON v.id = b.assigned_vehicle_id WHERE ${where} ORDER BY b.created_at DESC LIMIT 20`, [value]);
  if (!rows.length) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  if (!reference && rows.length > 1) return success(res, { mode: 'list', bookings: rows.map((row) => ({ id: String(row.id), booking_reference: row.booking_reference, status: row.status, trip_type: row.trip_type, customer_name: row.customer_name, pickup_location: row.pickup_location, drop_location: row.drop_location, pickup_at: row.pickup_at })) });
  const row = rows[0];
  const [history] = await pool.execute('SELECT old_status, new_status, note, changed_at FROM booking_status_history WHERE booking_id = ? ORDER BY changed_at, id', [row.id]);
  return success(res, { mode: 'detail', booking: { ...row, id: String(row.id), driver: row.driver_id == null ? null : { id: String(row.driver_id), name: row.driver_name, phone: row.driver_phone, photo_url: row.driver_photo }, vehicle: row.vehicle_name ? { name: row.vehicle_name, registration: row.registration_no } : null, status_history: history } });
}

function feedbackBookingId(token) {
  const [id, signature] = String(token || '').split('.');
  if (!/^\d+$/.test(id || '') || !signature) return null;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(`feedback:${id}`).digest('hex').slice(0, 24);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer) ? Number(id) : null;
}

async function getFeedback(req, res) {
  const id = feedbackBookingId(req.params.token);
  if (!id) { const error = new Error('Feedback link is invalid.'); error.statusCode = 404; throw error; }
  const [rows] = await pool.execute('SELECT b.*, d.id AS driver_id, d.name AS driver_name, d.phone AS driver_phone, d.profile_image_url AS driver_photo, v.vehicle_name, v.registration_no FROM bookings b LEFT JOIN drivers d ON d.id = b.assigned_driver_id LEFT JOIN vehicles v ON v.id = b.assigned_vehicle_id WHERE b.id = ? LIMIT 1', [id]);
  if (!rows[0]) { const error = new Error('Booking not found.'); error.statusCode = 404; throw error; }
  const row = rows[0];
  const [ratings] = await pool.execute('SELECT customer_rating, customer_review FROM trip_ratings WHERE booking_id = ? LIMIT 1', [id]);
  return success(res, { booking_reference: row.booking_reference, status: row.status, trip_type: row.trip_type, customer_name: row.customer_name, pickup_location: row.pickup_location, drop_location: row.drop_location, pickup_at: row.pickup_at, completed_at: row.completed_at, estimated_total: Number(row.estimated_total), final_total: row.final_total == null ? null : Number(row.final_total), can_submit: row.status === 'completed', already_submitted: Boolean(ratings[0]), submitted_rating: ratings[0]?.customer_rating || null, submitted_review: ratings[0]?.customer_review || null, driver: row.driver_id == null ? null : { id: String(row.driver_id), name: row.driver_name, phone: row.driver_phone, photo_url: row.driver_photo }, vehicle: row.vehicle_name ? { name: row.vehicle_name, registration: row.registration_no } : null });
}

async function submitFeedback(req, res) {
  const id = feedbackBookingId(req.params.token);
  const rating = Number(req.body.rating);
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) { const error = new Error('Invalid feedback request.'); error.statusCode = 422; throw error; }
  const [bookings] = await pool.execute('SELECT id, customer_id, assigned_driver_id, customer_name, customer_phone, status FROM bookings WHERE id = ? LIMIT 1', [id]);
  if (!bookings[0] || bookings[0].status !== 'completed') { const error = new Error('Feedback opens after the trip is completed.'); error.statusCode = 403; throw error; }
  const review = String(req.body.review || 'Great trip with Yaazh Cabs.').trim();
  await pool.execute(`INSERT INTO trip_ratings (booking_id, customer_id, driver_id, customer_rating, customer_review) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE customer_rating = VALUES(customer_rating), customer_review = VALUES(customer_review)`, [id, bookings[0].customer_id, bookings[0].assigned_driver_id, rating, review]);
  await pool.execute(`INSERT INTO testimonials (booking_id, customer_id, customer_name, customer_phone, rating, review, approval_status) VALUES (?, ?, ?, ?, ?, ?, 'pending') ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review), approval_status = 'pending'`, [id, bookings[0].customer_id, bookings[0].customer_name, bookings[0].customer_phone, rating, review]);
  return success(res, { id: String(id), rating, review }, 'Thank you for your feedback.', 201);
}

async function gallery(req, res) {
  const [groups] = await pool.execute('SELECT * FROM gallery_groups WHERE is_active = 1 ORDER BY display_order, id');
  const [images] = await pool.execute('SELECT id, group_id, image_url, caption FROM gallery_images WHERE is_active = 1 ORDER BY display_order, id');
  return success(res, groups.map((group) => ({ id: String(group.id), slug: group.slug, title: group.title, group_type: group.group_type, images: images.filter((image) => Number(image.group_id) === Number(group.id)).map((image) => ({ ...image, id: String(image.id), group_id: undefined })) })).filter((group) => group.images.length));
}

async function createGuestBooking(req, res) {
  if (req.user?.typ === 'customer') {
    const [customers] = await pool.execute(
      `SELECT name, phone, email FROM customers WHERE id = ? AND is_active = 1 AND app_status = 'active' LIMIT 1`,
      [Number(req.user.sub)]
    );
    if (!customers[0]) { const error = new Error('Customer not found.'); error.statusCode = 404; throw error; }
    req.body.customer_name = req.body.customer_name || customers[0].name;
    req.body.customer_phone = req.body.customer_phone || customers[0].phone;
    req.body.customer_email = req.body.customer_email || customers[0].email;
  }
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
  const pickupAt = mysqlDateTime(req.body.pickup_at, 'pickup_at');
  const returnAt = req.body.return_at ? mysqlDateTime(req.body.return_at, 'return_at') : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const authenticatedCustomerId = req.user?.typ === 'customer' ? Number(req.user.sub) : null;
    const websiteCustomer = authenticatedCustomerId
      ? { id: authenticatedCustomerId, phone: normalizePhone(req.body.customer_phone) }
      : await findOrCreateWebsiteCustomer(connection, {
        name: req.body.customer_name,
        phone: req.body.customer_phone,
        email: req.body.customer_email,
      });
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
    let distance = Number(req.body.estimated_distance_km || route?.distance_km || 0);
    if (!distance && req.body.pickup_latitude != null && req.body.pickup_longitude != null && req.body.drop_latitude != null && req.body.drop_longitude != null) {
      distance = Number(haversineDistance(
        { latitude: number(req.body.pickup_latitude, 'pickup_latitude'), longitude: number(req.body.pickup_longitude, 'pickup_longitude') },
        { latitude: number(req.body.drop_latitude, 'drop_latitude'), longitude: number(req.body.drop_longitude, 'drop_longitude') }
      ).toFixed(2));
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      const error = new Error('A valid route, distance, or pickup/drop coordinates are required to calculate the fare.');
      error.statusCode = 422;
      throw error;
    }
    const rate = req.body.trip_type === 'round_trip' ? Number(category.round_trip_rate_per_km) : Number(category.one_way_rate_per_km);
    const baseFare = Number((distance * rate + Number(category.driver_batta)).toFixed(2));
    const reference = `CAB${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.slice(0, 30);
    const [result] = await connection.execute(
      `INSERT INTO bookings (booking_reference, customer_id, vehicle_category_id, route_id, trip_type, booking_source,
       customer_name, customer_phone, customer_email, pickup_location, drop_location, pickup_city, drop_city,
       pickup_at, return_at, passenger_count, special_note, estimated_distance_km, estimated_duration_minutes,
       rate_per_km, driver_batta, base_fare, estimated_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [reference, websiteCustomer.id, vehicleCategoryId, route?.id || null,
        req.body.trip_type, req.user?.typ === 'customer' ? 'customer_app' : 'website', req.body.customer_name, websiteCustomer.phone,
        req.body.customer_email || null, req.body.pickup_location, req.body.drop_location, req.body.pickup_city || null,
        req.body.drop_city || null, pickupAt, returnAt,
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

module.exports = { listCities, listRoutes, getRoute, listVehicleCategories, listTariffs, listFaqs, getCmsPage, listBlog, getBlog, listTestimonials, appConfig, contact, routeEstimate, fareEstimate, trackBooking, getFeedback, submitFeedback, gallery, createGuestBooking };