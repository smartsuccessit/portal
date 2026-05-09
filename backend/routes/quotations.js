'use strict';
const express     = require('express');
const router      = express.Router();
const db          = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Helper: generate next quote number ────────────────────────────────────
async function nextQuoteNumber() {
  const rows = await db.query("SELECT `value` FROM qt_settings WHERE `key`='qt_prefix'");
  const prefix = (rows[0] && rows[0].value) ? rows[0].value : 'QTSS';
  const now    = new Date();
  const yyyy   = now.getFullYear();
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const pattern = prefix + '-' + yyyy + '-' + mm + '%';
  const [existing] = await db.pool.execute(
    'SELECT quote_number FROM quotations WHERE quote_number LIKE ? ORDER BY id DESC LIMIT 1',
    [pattern]
  );
  let seq = 1;
  if (existing.length) {
    const last = existing[0].quote_number;
    const parts = last.split('-');
    seq = parseInt(parts[parts.length - 1] || '0') + 1;
  }
  return prefix + '-' + yyyy + '-' + mm + String(seq).padStart(3, '0');
}

// ── Settings ──────────────────────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const rows = await db.query('SELECT `key`, `value` FROM qt_settings');
    const obj  = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/settings', requireAuth, async (req, res) => {
  try {
    const allowed = ['qt_company_name','qt_address','qt_phone','qt_email','qt_website',
                     'qt_vat_number','qt_logo_url','qt_currency','qt_vat_pct',
                     'qt_prefix','qt_footer','qt_terms'];
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) {
        await db.pool.execute(
          'INSERT INTO qt_settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=?',
          [k, v, v]
        );
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Customers ─────────────────────────────────────────────────────────────
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? '%' + req.query.q + '%' : null;
    let rows;
    if (q) {
      rows = await db.query(
        'SELECT * FROM qt_customers WHERE company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? ORDER BY company_name LIMIT 20',
        [q, q, q]
      );
    } else {
      rows = await db.query('SELECT * FROM qt_customers ORDER BY company_name LIMIT 100');
    }
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', requireAuth, async (req, res) => {
  try {
    const { company_name, contact_name='', email='', phone='', address='', vat_number='', notes='' } = req.body;
    if (!company_name) return res.status(400).json({ error: 'Company name required' });
    const [r] = await db.pool.execute(
      'INSERT INTO qt_customers(company_name,contact_name,email,phone,address,vat_number,notes,created_by) VALUES(?,?,?,?,?,?,?,?)',
      [company_name, contact_name, email, phone, address, vat_number, notes, req.user.name]
    );
    res.json(await db.getOne('SELECT * FROM qt_customers WHERE id=?', [r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/customers/:id', requireAuth, async (req, res) => {
  try {
    const { company_name, contact_name='', email='', phone='', address='', vat_number='', notes='' } = req.body;
    await db.pool.execute(
      'UPDATE qt_customers SET company_name=?,contact_name=?,email=?,phone=?,address=?,vat_number=?,notes=? WHERE id=?',
      [company_name, contact_name, email, phone, address, vat_number, notes, req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/customers/:id', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('DELETE FROM qt_customers WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Quotations LIST ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, status, from, to } = req.query;
    let sql  = 'SELECT id,quote_number,quote_date,expiry_date,status,customer_snap,grand_total,currency,created_by,created_at FROM quotations WHERE 1=1';
    const params = [];
    if (q)      { sql += ' AND (quote_number LIKE ? OR customer_snap LIKE ?)'; params.push('%'+q+'%','%'+q+'%'); }
    if (status) { sql += ' AND status=?'; params.push(status); }
    if (from)   { sql += ' AND quote_date >= ?'; params.push(from); }
    if (to)     { sql += ' AND quote_date <= ?'; params.push(to); }
    sql += ' ORDER BY id DESC LIMIT 200';
    const rows = await db.query(sql, params);
    rows.forEach(r => {
      try { r.customer_snap = typeof r.customer_snap === 'string' ? JSON.parse(r.customer_snap) : r.customer_snap; }
      catch(e) { r.customer_snap = {}; }
    });
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Quotation SINGLE ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const q = await db.getOne('SELECT * FROM quotations WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Not found' });
    try { q.customer_snap = typeof q.customer_snap === 'string' ? JSON.parse(q.customer_snap) : q.customer_snap; } catch(e) { q.customer_snap = {}; }
    try { q.from_snap     = typeof q.from_snap     === 'string' ? JSON.parse(q.from_snap)     : q.from_snap;     } catch(e) { q.from_snap = {}; }
    q.items = await db.query('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sort_order', [q.id]);
    res.json(q);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CREATE Quotation ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const quote_number = await nextQuoteNumber();
    const customer_snap = JSON.stringify(b.customer_snap || {});
    const from_snap     = JSON.stringify(b.from_snap     || {});
    const [r] = await conn.execute(
      `INSERT INTO quotations(quote_number,quote_date,expiry_date,status,customer_id,
       customer_snap,from_snap,notes,footer_text,vat_pct,subtotal,vat_amount,grand_total,currency,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [quote_number, b.quote_date || new Date().toISOString().slice(0,10),
       b.expiry_date || null, b.status || 'Draft', b.customer_id || null,
       customer_snap, from_snap, b.notes || '', b.footer_text || '',
       b.vat_pct || 15, b.subtotal || 0, b.vat_amount || 0, b.grand_total || 0,
       b.currency || 'SAR', req.user.name]
    );
    const qid = r.insertId;
    const items = Array.isArray(b.items) ? b.items : [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await conn.execute(
        'INSERT INTO quotation_items(quotation_id,sort_order,description,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?)',
        [qid, i, it.description || '', it.quantity || 1, it.unit_price || 0, it.line_total || 0]
      );
    }
    await conn.commit();
    conn.release();
    // Return full quotation
    const full = await db.getOne('SELECT * FROM quotations WHERE id=?', [qid]);
    try { full.customer_snap = JSON.parse(full.customer_snap); } catch(e) { full.customer_snap = {}; }
    try { full.from_snap     = JSON.parse(full.from_snap);     } catch(e) { full.from_snap = {}; }
    full.items = await db.query('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sort_order', [qid]);
    res.json(full);
  } catch(e) {
    await conn.rollback(); conn.release();
    res.status(500).json({ error: e.message });
  }
});

// ── UPDATE Quotation ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const b   = req.body;
    const id  = req.params.id;
    const customer_snap = JSON.stringify(b.customer_snap || {});
    const from_snap     = JSON.stringify(b.from_snap     || {});
    await conn.execute(
      `UPDATE quotations SET quote_date=?,expiry_date=?,status=?,customer_id=?,
       customer_snap=?,from_snap=?,notes=?,footer_text=?,vat_pct=?,
       subtotal=?,vat_amount=?,grand_total=?,currency=? WHERE id=?`,
      [b.quote_date, b.expiry_date || null, b.status || 'Draft', b.customer_id || null,
       customer_snap, from_snap, b.notes || '', b.footer_text || '',
       b.vat_pct || 15, b.subtotal || 0, b.vat_amount || 0, b.grand_total || 0,
       b.currency || 'SAR', id]
    );
    // Replace items
    await conn.execute('DELETE FROM quotation_items WHERE quotation_id=?', [id]);
    const items = Array.isArray(b.items) ? b.items : [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await conn.execute(
        'INSERT INTO quotation_items(quotation_id,sort_order,description,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?)',
        [id, i, it.description || '', it.quantity || 1, it.unit_price || 0, it.line_total || 0]
      );
    }
    await conn.commit();
    conn.release();
    res.json({ ok: true });
  } catch(e) {
    await conn.rollback(); conn.release();
    res.status(500).json({ error: e.message });
  }
});

// ── UPDATE Status only ────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('UPDATE quotations SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DUPLICATE Quotation ───────────────────────────────────────────────────
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const orig = await db.getOne('SELECT * FROM quotations WHERE id=?', [req.params.id]);
    if (!orig) return res.status(404).json({ error: 'Not found' });
    const items = await db.query('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sort_order', [orig.id]);
    const quote_number = await nextQuoteNumber();
    const today = new Date().toISOString().slice(0,10);
    const [r] = await db.pool.execute(
      `INSERT INTO quotations(quote_number,quote_date,expiry_date,status,customer_id,
       customer_snap,from_snap,notes,footer_text,vat_pct,subtotal,vat_amount,grand_total,currency,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [quote_number, today, orig.expiry_date, 'Draft', orig.customer_id,
       orig.customer_snap, orig.from_snap, orig.notes, orig.footer_text,
       orig.vat_pct, orig.subtotal, orig.vat_amount, orig.grand_total, orig.currency, req.user.name]
    );
    const newId = r.insertId;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await db.pool.execute(
        'INSERT INTO quotation_items(quotation_id,sort_order,description,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?)',
        [newId, it.sort_order, it.description, it.quantity, it.unit_price, it.line_total]
      );
    }
    res.json({ id: newId, quote_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE Quotation ──────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('DELETE FROM quotations WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
