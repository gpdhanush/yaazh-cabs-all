const express = require('express');
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.post('/customer/register', asyncHandler(controller.registerCustomer));
router.post('/:type(customer|driver|admin)/login', asyncHandler(controller.login));
router.post('/:type(customer|driver|admin)/refresh', asyncHandler(controller.refresh));
router.post('/:type(customer|driver|admin)/logout', asyncHandler(controller.logout));
router.post('/:type(customer|driver|admin)/logout-all', requireAuth('customer', 'driver', 'admin'), asyncHandler(controller.logoutAll));
router.post('/admin/change-password', requireAuth('admin'), asyncHandler(controller.changeAdminPassword));
router.post('/admin/reset-password', asyncHandler(controller.resetAdminPasswordByEmail));

module.exports = router;