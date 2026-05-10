'use strict';
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'SmartSuccess2026xK9mP3qR7nL2wT8secure';

function hashPin(pin)            { return bcrypt.hashSync(String(pin), 10); }
function verifyPin(pin, hash)    { return bcrypt.compareSync(String(pin), hash); }
function signToken(payload)      { return jwt.sign(payload, SECRET, { expiresIn: '12h' }); }

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return res.status(403).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch(e) { res.status(403).json({ error: 'Unauthorized' }); }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, function() {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

module.exports = { hashPin, verifyPin, signToken, requireAuth, requireAdmin };
