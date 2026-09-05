const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/public.controller');

const router = express.Router();
router.get('/cities', asyncHandler(controller.listCities));
router.get('/routes', asyncHandler(controller.listRoutes));
router.get('/routes/:slug', asyncHandler(controller.getRoute));
router.get('/vehicle-categories', asyncHandler(controller.listVehicleCategories));
router.get('/tariffs', asyncHandler(controller.listTariffs));
router.get('/faqs', asyncHandler(controller.listFaqs));
router.get('/cms/pages/:slug', asyncHandler(controller.getCmsPage));
router.get('/blog', asyncHandler(controller.listBlog));
router.get('/blog/:slug', asyncHandler(controller.getBlog));
router.get('/testimonials', asyncHandler(controller.listTestimonials));
router.get('/gallery', asyncHandler(controller.gallery));
router.get('/app-config', asyncHandler(controller.appConfig));
router.post('/contact', asyncHandler(controller.contact));
router.post('/route/estimate', asyncHandler(controller.routeEstimate));
router.get('/route/estimate', asyncHandler(controller.routeEstimate));
router.post('/fare/estimate', asyncHandler(controller.fareEstimate));
router.post('/bookings/track', asyncHandler(controller.trackBooking));
router.get('/feedback/:token', asyncHandler(controller.getFeedback));
router.post('/feedback/:token', asyncHandler(controller.submitFeedback));
router.post('/bookings', asyncHandler(controller.createGuestBooking));

module.exports = router;