const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
