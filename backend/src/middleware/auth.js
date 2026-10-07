const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        code: 'NO_TOKEN',
        message: 'Authentication required',
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, fullName: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'User no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }
};

module.exports = authenticate;