const express = require('express');
const { register, login, logout, me } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const authLimiter = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

module.exports = router;