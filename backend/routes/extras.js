'use strict';
/**
 * Extra apps routes:
 * - /api/pl-entries        — Profit & Loss
 * - /api/money-ledger      — Money Ledger
 * - /api/reimbursements    — Reimbursements
 * - /api/invoices          — Invoice Tracker
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Helper: generic CRUD factory ──────────────────────────────────────────
function crud(table, fields, orderBy='id DESC') {
  router.get(`/${table}`, requireAuth, async (req, res) => {
    try { res.json(await db.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`)); }
    catch(e) { res.status(500).json({ error: e.message }); }
  });

  router.post(`/${table}`, requireAuth, async (req, res) => {
    try {
      const cols  = fields.filter(f => req.body[f] !== undefined);
      const vals  = cols.map(f => req.body[f]);
      const [r]   = await db.pool.execute(
        `INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`,
        vals
      );
      res.json(await db.getOne(`SELECT * FROM ${table} WHERE id=?`, [r.insertId]));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  router.put(`/${table}/:id`, requireAuth, async (req, res) => {
    try {
      const cols = fields.filter(f => req.body[f] !== undefined);
      if (!cols.length) return res.json({ ok: true });
      const vals = [...cols.map(f => req.body[f]), req.params.id];
      await db.pool.execute(
        `UPDATE ${table} SET ${cols.map(f=>`${f}=?`).join(',')} WHERE id=?`, vals
      );
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  router.delete(`/${table}/:id`, requireAuth, async (req, res) => {
    try {
      await db.pool.execute(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

// ── Register CRUD for each app (hyphenated URL paths) ─────────────────────

function crudPath(path, table, fields, orderBy) {
  orderBy = orderBy || 'id DESC';
  router.get('/' + path, requireAuth, async function(req, res) {
    try { res.json(await db.query('SELECT * FROM ' + table + ' ORDER BY ' + orderBy)); }
    catch(e) { res.status(500).json({ error: e.message }); }
  });
  router.post('/' + path, requireAuth, async function(req, res) {
    try {
      var cols = fields.filter(function(f){ return req.body[f] !== undefined; });
      var vals = cols.map(function(f){ return req.body[f]; });
      var r    = await db.pool.execute(
        'INSERT INTO ' + table + '(' + cols.join(',') + ') VALUES(' + cols.map(function(){ return '?'; }).join(',') + ')',
        vals
      );
      res.json(await db.getOne('SELECT * FROM ' + table + ' WHERE id=?', [r[0].insertId]));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
  router.put('/' + path + '/:id', requireAuth, async function(req, res) {
    try {
      var cols = fields.filter(function(f){ return req.body[f] !== undefined; });
      if (!cols.length) return res.json({ ok: true });
      var vals = cols.map(function(f){ return req.body[f]; }).concat([req.params.id]);
      await db.pool.execute(
        'UPDATE ' + table + ' SET ' + cols.map(function(f){ return f + '=?'; }).join(',') + ' WHERE id=?',
        vals
      );
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
  router.delete('/' + path + '/:id', requireAuth, async function(req, res) {
    try {
      await db.pool.execute('DELETE FROM ' + table + ' WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

crudPath('pl-entries', 'pl_entries',
  ['type','month','year','category','description','amount','note','entered_by'],
  'year DESC, month DESC, id DESC'
);

// P&L Categories
// P&L Categories - explicit routes with hyphen path
router.get('/pl-categories', requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM pl_categories ORDER BY type, sort')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/pl-categories', requireAuth, async (req, res) => {
  try {
    const { type, name_en, name_ar='', sort=99 } = req.body;
    const [r] = await db.pool.execute('INSERT INTO pl_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)',[type,name_en,name_ar,sort]);
    res.json(await db.getOne('SELECT * FROM pl_categories WHERE id=?',[r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.put('/pl-categories/:id', requireAuth, async (req, res) => {
  try {
    const { name_en, name_ar } = req.body;
    await db.pool.execute('UPDATE pl_categories SET name_en=?,name_ar=? WHERE id=?',[name_en,name_ar,req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.delete('/pl-categories/:id', requireAuth, async (req, res) => {
  try { await db.pool.execute('DELETE FROM pl_categories WHERE id=?',[req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// Invoice payments history
router.get('/invoices/:id/payments', requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM invoice_payments WHERE invoice_id=? ORDER BY payment_date ASC',[req.params.id])); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/invoices/:id/payments', requireAuth, async (req, res) => {
  try {
    const { amount, payment_method='Bank Transfer', payment_date, reference='' } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'Missing fields' });
    const [r] = await db.pool.execute(
      'INSERT INTO invoice_payments(invoice_id,amount,payment_method,payment_date,reference,recorded_by) VALUES(?,?,?,?,?,?)',
      [req.params.id, amount, payment_method, payment_date, reference, req.user.name]
    );
    // Update invoice paid_amount
    const payments = await db.query('SELECT SUM(amount) as total FROM invoice_payments WHERE invoice_id=?',[req.params.id]);
    const newPaid = parseFloat(payments[0].total || 0);
    await db.pool.execute('UPDATE invoices SET paid_amount=?,last_payment_date=? WHERE id=?',
      [newPaid, payment_date, req.params.id]);
    res.json(await db.getOne('SELECT * FROM invoice_payments WHERE id=?',[r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.delete('/invoice-payments/:id', requireAuth, async (req, res) => {
  try {
    const pay = await db.getOne('SELECT * FROM invoice_payments WHERE id=?',[req.params.id]);
    if (!pay) return res.status(404).json({ error: 'Not found' });
    await db.pool.execute('DELETE FROM invoice_payments WHERE id=?',[req.params.id]);
    // Recalculate invoice paid_amount
    const payments = await db.query('SELECT SUM(amount) as total FROM invoice_payments WHERE invoice_id=?',[pay.invoice_id]);
    const newPaid = parseFloat(payments[0].total || 0);
    await db.pool.execute('UPDATE invoices SET paid_amount=? WHERE id=?',[newPaid, pay.invoice_id]);
    res.json({ ok: true, new_paid: newPaid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Money Ledger Categories
router.get('/ml-categories', requireAuth, async function(req, res) {
  try { res.json(await db.query('SELECT * FROM ml_categories ORDER BY direction, sort')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/ml-categories', requireAuth, async function(req, res) {
  try {
    var _a = req.body, direction = _a.direction, name_en = _a.name_en, name_ar = _a.name_ar; if(!name_ar) name_ar=''; var sort = _a.sort||99;
    var r = await db.pool.execute('INSERT INTO ml_categories(direction,name_en,name_ar,sort) VALUES(?,?,?,?)',[direction,name_en,name_ar,sort]);
    res.json(await db.getOne('SELECT * FROM ml_categories WHERE id=?',[r[0].insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.put('/ml-categories/:id', requireAuth, async function(req, res) {
  try {
    var _a = req.body, name_en = _a.name_en, name_ar = _a.name_ar;
    await db.pool.execute('UPDATE ml_categories SET name_en=?,name_ar=? WHERE id=?',[name_en,name_ar,req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.delete('/ml-categories/:id', requireAuth, async function(req, res) {
  try { await db.pool.execute('DELETE FROM ml_categories WHERE id=?',[req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// Reimbursement Categories
router.get('/rb-categories', requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM rb_categories ORDER BY sort')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/rb-categories', requireAuth, async (req, res) => {
  try {
    const { name_en, name_ar='', sort=99 } = req.body;
    const [r] = await db.pool.execute('INSERT INTO rb_categories(name_en,name_ar,sort) VALUES(?,?,?)',[name_en,name_ar,sort]);
    res.json(await db.getOne('SELECT * FROM rb_categories WHERE id=?',[r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.put('/rb-categories/:id', requireAuth, async (req, res) => {
  try {
    const { name_en, name_ar } = req.body;
    await db.pool.execute('UPDATE rb_categories SET name_en=?,name_ar=? WHERE id=?',[name_en,name_ar,req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.delete('/rb-categories/:id', requireAuth, async (req, res) => {
  try { await db.pool.execute('DELETE FROM rb_categories WHERE id=?',[req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
