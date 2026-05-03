'use strict';
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET  = process.env.JWT_SECRET || 'ss-portal-secret-change-me';
const EXPIRES = '24h';

const hashPin   = pin  => bcrypt.hashSync(String(pin), 10);
const verifyPin = (pin, hash) => bcrypt.compareSync(String(pin), hash);
const signToken = payload => jwt.sign(payload, SECRET, { expiresIn: EXPIRES });

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

module.exports = { hashPin, verifyPin, signToken, requireAuth, requireAdmin };
