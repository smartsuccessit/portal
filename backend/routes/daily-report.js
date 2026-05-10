'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/entries', requireAuth, async (req, res) => {
  try {
    const { date, member } = req.query;
    let sql = 'SELECT de.*, dm.report_date, dm.submitted_by FROM daily_entries de JOIN daily_meta dm ON de.meta_id=dm.id WHERE 1=1';
    const p = [];
    if (date)   { sql += ' AND dm.report_date=?'; p.push(date); }
    if (member) { sql += ' AND dm.submitted_by=?'; p.push(member); }
    sql += ' ORDER BY dm.report_date DESC, de.id DESC';
    res.json(await db.query(sql, p));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { report_date, entries=[] } = req.body;
    const existing = await db.getOne('SELECT id FROM daily_meta WHERE report_date=? AND submitted_by=?', [report_date, req.user.name]);
    let metaId;
    if (existing) {
      metaId = existing.id;
      await db.pool.execute('DELETE FROM daily_entries WHERE meta_id=?', [metaId]);
    } else {
      const [r] = await db.pool.execute('INSERT INTO daily_meta(report_date,submitted_by) VALUES(?,?)', [report_date, req.user.name]);
      metaId = r.insertId;
    }
    for (const e of entries) {
      await db.pool.execute('INSERT INTO daily_entries(meta_id,task,hours,notes) VALUES(?,?,?,?)', [metaId, e.task||'', e.hours||0, e.notes||'']);
    }
    res.json({ ok: true, meta_id: metaId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
