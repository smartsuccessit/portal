'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.query('SELECT `key`,`value` FROM settings');
    const obj = {}; rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/', requireAuth, async (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) {
      await db.pool.execute('INSERT INTO settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=?', [k, v, v]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
