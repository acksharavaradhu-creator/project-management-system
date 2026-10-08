const express = require('express');
const authenticate = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticate);

// GET /api/dashboard
router.get('/', getDashboard);

module.exports = router;