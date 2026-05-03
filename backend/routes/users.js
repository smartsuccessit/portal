'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { hashPin, verifyPin, signToken, requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users — public, for login grid
router.get('/', async (req, res) => {
  try {
    const users = await db.query('SELECT id,name,name_ar,initials,color,role,is_admin,is_approver FROM users ORDER BY id');
    for (const u of users) {
      const rows = await db.query('SELECT app_id FROM app_access WHERE user_id=?', [u.id]);
      u.apps = rows.map(r => r.app_id);
    }
    res.json(users);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });
    const user = await db.getOne('SELECT * FROM users WHERE name=?', [name]);
    if (!user || !verifyPin(pin, user.pin_hash))
      return res.status(401).json({ error: 'Invalid name or PIN' });
    const apps = (await db.query('SELECT app_id FROM app_access WHERE user_id=?', [user.id])).map(r => r.app_id);
    const token = signToken({ id: user.id, name: user.name, is_admin: user.is_admin, is_approver: user.is_approver });
    res.json({ token, user: { id:user.id, name:user.name, name_ar:user.name_ar, initials:user.initials, color:user.color, role:user.role, is_admin:user.is_admin, is_approver:user.is_approver, apps } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getOne('SELECT id,name,name_ar,initials,color,role,is_admin,is_approver FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const apps = (await db.query('SELECT app_id FROM app_access WHERE user_id=?', [user.id])).map(r => r.app_id);
    res.json({ ...user, apps });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, name_ar='', initials, color='#1e2d4a', role, pin, apps=[] } = req.body;
    if (!name||!initials||!role||!pin) return res.status(400).json({ error: 'Missing fields' });
    const exists = await db.getOne('SELECT id FROM users WHERE name=?', [name]);
    if (exists) return res.status(409).json({ error: 'User already exists' });
    const [r] = await db.pool.execute('INSERT INTO users(name,name_ar,initials,color,role,pin_hash) VALUES(?,?,?,?,?,?)', [name,name_ar,initials,color,role,hashPin(pin)]);
    const uid = r.insertId;
    const defaultApps = [...new Set(['petty-cash','daily-report','tasks','roles','profile','pl-report','money-ledger','reimbursements','invoices',...apps])];
    for (const app of defaultApps) await db.pool.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [uid,app]);
    res.json({ id:uid, name, name_ar, initials, color, role, is_admin:0, is_approver:0, apps:defaultApps });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    const isSelf = req.user.id === uid;
    if (!req.user.is_admin && !isSelf) return res.status(403).json({ error: 'Forbidden' });
    const { name_ar, role, color, is_approver, apps } = req.body;
    if (name_ar !== undefined) await db.pool.execute('UPDATE users SET name_ar=? WHERE id=?', [name_ar, uid]);
    if (req.user.is_admin) {
      if (role        !== undefined) await db.pool.execute('UPDATE users SET role=? WHERE id=?', [role, uid]);
      if (color       !== undefined) await db.pool.execute('UPDATE users SET color=? WHERE id=?', [color, uid]);
      if (is_approver !== undefined) await db.pool.execute('UPDATE users SET is_approver=? WHERE id=?', [is_approver?1:0, uid]);
      if (apps        !== undefined) {
        await db.pool.execute('DELETE FROM app_access WHERE user_id=?', [uid]);
        for (const app of apps) await db.pool.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [uid, app]);
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id/pin
router.put('/:id/pin', requireAuth, async (req, res) => {
  try {
    const uid  = parseInt(req.params.id);
    const user = await db.getOne('SELECT * FROM users WHERE id=?', [uid]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const isSelf = req.user.id === uid;
    if (!req.user.is_admin && !isSelf) return res.status(403).json({ error: 'Forbidden' });
    if (isSelf && !req.user.is_admin) {
      if (!verifyPin(req.body.current_pin, user.pin_hash))
        return res.status(403).json({ error: 'Current PIN is incorrect' });
    }
    const { new_pin } = req.body;
    if (!/^\d{4}$/.test(String(new_pin))) return res.status(400).json({ error: 'PIN must be 4 digits' });
    await db.pool.execute('UPDATE users SET pin_hash=? WHERE id=?', [hashPin(new_pin), uid]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const user = await db.getOne('SELECT is_admin FROM users WHERE id=?', [req.params.id]);
    if (!user)         return res.status(404).json({ error: 'Not found' });
    if (user.is_admin) return res.status(403).json({ error: 'Cannot delete admin' });
    await db.pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
