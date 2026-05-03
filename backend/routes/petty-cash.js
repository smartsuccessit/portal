'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const getPerms = async () => {
  const rows = await db.query('SELECT `key`,`value` FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
};

router.get('/',            requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM petty_cash ORDER BY entry_date DESC, id DESC')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/',           requireAuth, async (req, res) => {
  try {
    const { type, amount, category, description, note='', entry_date } = req.body;
    if (!type||!amount||!category||!description||!entry_date) return res.status(400).json({ error: 'Missing fields' });
    const approved = type === 'in' ? 1 : 0;
    const [r] = await db.pool.execute(
      'INSERT INTO petty_cash(type,amount,category,description,note,entered_by,entry_date,approved) VALUES(?,?,?,?,?,?,?,?)',
      [type, amount, category, description, note, req.user.name, entry_date, approved]
    );
    res.json(await db.getOne('SELECT * FROM petty_cash WHERE id=?', [r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/categories',  requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM pc_categories ORDER BY type,sort')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { type, name_en, name_ar, sort=99 } = req.body;
    if (!type||!name_en||!name_ar) return res.status(400).json({ error: 'Missing fields' });
    const [r] = await db.pool.execute('INSERT INTO pc_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)', [type,name_en,name_ar,sort]);
    res.json({ id:r.insertId, type, name_en, name_ar, sort });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name_en, name_ar } = req.body;
    await db.pool.execute('UPDATE pc_categories SET name_en=?,name_ar=? WHERE id=?', [name_en,name_ar,req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try { await db.pool.execute('DELETE FROM pc_categories WHERE id=?', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const perms = await getPerms();
    if (!req.user.is_admin && req.user.name !== perms.approver)
      return res.status(403).json({ error: `Only ${perms.approver} can approve` });
    await db.pool.execute('UPDATE petty_cash SET approved=1,approved_by=?,approved_at=NOW() WHERE id=?', [req.user.name,req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/request-delete', requireAuth, async (req, res) => {
  try {
    const perms = await getPerms();
    if (req.user.is_admin || req.user.name === perms.deleter) {
      await db.pool.execute('DELETE FROM petty_cash WHERE id=?', [req.params.id]);
    } else {
      await db.pool.execute('UPDATE petty_cash SET pend_delete=1,del_req_by=? WHERE id=?', [req.user.name,req.params.id]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/approve-delete', requireAuth, async (req, res) => {
  try {
    const perms = await getPerms();
    if (!req.user.is_admin && req.user.name !== perms.deleter)
      return res.status(403).json({ error: 'No permission' });
    await db.pool.execute('DELETE FROM petty_cash WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/export', requireAdmin, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM petty_cash ORDER BY entry_date ASC')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
