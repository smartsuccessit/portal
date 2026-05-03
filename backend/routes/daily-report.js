'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/:date', requireAuth, async (req, res) => {
  try {
    const entries = await db.query('SELECT * FROM daily_entries WHERE report_date=? ORDER BY created_at', [req.params.date]);
    const meta    = await db.getOne('SELECT * FROM daily_meta WHERE report_date=?', [req.params.date]);
    res.json({ entries, quotations: meta ? meta.quotations : 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/range/:start/:end', requireAuth, async (req, res) => {
  try {
    const entries = await db.query('SELECT * FROM daily_entries WHERE report_date BETWEEN ? AND ? ORDER BY report_date,created_at', [req.params.start,req.params.end]);
    const metas   = await db.query('SELECT * FROM daily_meta WHERE report_date BETWEEN ? AND ?', [req.params.start,req.params.end]);
    res.json({ entries, metas });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/entry', requireAuth, async (req, res) => {
  try {
    const { report_date, section, member, amount, method, note='' } = req.body;
    if (!report_date||!section||!member||!amount||!method) return res.status(400).json({ error: 'Missing fields' });
    const [r] = await db.pool.execute(
      'INSERT INTO daily_entries(report_date,section,member,amount,method,note) VALUES(?,?,?,?,?,?)',
      [report_date,section,member,amount,method,note]
    );
    res.json(await db.getOne('SELECT * FROM daily_entries WHERE id=?', [r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/entry/:id', requireAuth, async (req, res) => {
  try { await db.pool.execute('DELETE FROM daily_entries WHERE id=?', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/quotations', requireAuth, async (req, res) => {
  try {
    const { report_date, quotations } = req.body;
    await db.pool.execute('INSERT INTO daily_meta(report_date,quotations) VALUES(?,?) ON DUPLICATE KEY UPDATE quotations=?', [report_date,quotations,quotations]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/reset/:date', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('DELETE FROM daily_entries WHERE report_date=?', [req.params.date]);
    await db.pool.execute('DELETE FROM daily_meta WHERE report_date=?', [req.params.date]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
