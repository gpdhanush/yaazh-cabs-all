const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/admin.controller');

const router = express.Router();
router.use(requireAuth('admin'));
router.get('/profile', asyncHandler(controller.profile));
router.put('/profile', asyncHandler(controller.updateProfile));
router.get('/settings', asyncHandler(controller.settings));
router.put('/settings/:key', asyncHandler(controller.updateSetting));
router.get('/bookings', asyncHandler(controller.listBookings));

module.exports = router;