const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const SALT_ROUNDS = 12;

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// A fixed hash used to keep login timing similar when the email doesn't exist
const DUMMY_HASH =
  '$2b$12$B7pt5Zb.Kvbjn6GCBjE0Tey6rCDJXiYomCk2OAB2ofSixLptQPYBy';

const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { fullName, email, passwordHash },
      select: { id: true, fullName: true, email: true, createdAt: true },
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always run a compare so response time doesn't reveal whether the email exists
    const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  // JWTs are stateless: the client deletes its token. The server just confirms.
  return res.json({ message: 'Logged out successfully' });
};

const me = (req, res) => {
  return res.json({ user: req.user });
};

module.exports = { register, login, logout, me };