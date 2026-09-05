const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/driver.controller');

const router = express.Router();
router.use(requireAuth('driver'));
router.get('/profile', asyncHandler(controller.profile));
router.put('/profile', asyncHandler(controller.updateProfile));
router.get('/status', asyncHandler(controller.status));
router.put('/status', asyncHandler(controller.status));
router.get('/offers', asyncHandler(controller.listOffers));
router.get('/offers/:offerId', asyncHandler(controller.getOffer));
router.post('/offers/:offerId/accept', asyncHandler(controller.acceptOffer));
router.post('/offers/:offerId/reject', asyncHandler(controller.rejectOffer));
router.get('/trips', asyncHandler(controller.listTrips));
router.get('/trips/:bookingId', asyncHandler(controller.getTrip));
router.post('/location', asyncHandler(controller.updateLocation));

module.exports = router;
