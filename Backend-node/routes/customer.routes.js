const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/customer.controller');

const router = express.Router();
router.use(requireAuth('customer'));
router.get('/profile', asyncHandler(controller.profile));
router.put('/profile', asyncHandler(controller.updateProfile));
router.get('/saved-places', asyncHandler(controller.listSavedPlaces));
router.post('/saved-places', asyncHandler(controller.createSavedPlace));
router.delete('/saved-places/:savedPlaceId', asyncHandler(controller.deleteSavedPlace));
router.get('/bookings', asyncHandler(controller.listBookings));
router.get('/bookings/:bookingId', asyncHandler(controller.getBooking));
router.post('/bookings/:bookingId/cancel', asyncHandler(controller.cancelBooking));

module.exports = router;