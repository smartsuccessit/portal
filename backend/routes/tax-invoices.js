'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Generate invoice number ───────────────────────────────────────────────
async function nextInvoiceNumber() {
  const rows = await db.query("SELECT `value` FROM ti_settings WHERE `key`='ti_prefix'");
  const prefix = (rows[0] && rows[0].value) ? rows[0].value : 'INV';
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const pattern = prefix + '-' + yyyy + '-' + mm + '___';
  const [existing] = await db.pool.execute(
    'SELECT invoice_number FROM tax_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1',
    [pattern]
  );
  let seq = 1;
  if (existing.length) {
    const last = existing[0].invoice_number;
    const seqStr = last.slice(-3);
    const parsed = parseInt(seqStr);
    if (!isNaN(parsed)) seq = parsed + 1;
  }
  return prefix + '-' + yyyy + '-' + mm + String(seq).padStart(3, '0');
}

// ── Settings ──────────────────────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const rows = await db.query('SELECT `key`, `value` FROM ti_settings');
    const obj = {}; rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/settings', requireAuth, async (req, res) => {
  try {
    const allowed = ['ti_prefix','ti_company_name','ti_address','ti_phone','ti_email',
                     'ti_website','ti_vat_number','ti_logo_url','ti_currency','ti_vat_pct',
                     'ti_footer','ti_terms'];
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) {
        await db.pool.execute(
          'INSERT INTO ti_settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=?',
          [k, v, v]
        );
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── List invoices ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, status, from, to } = req.query;
    let sql = 'SELECT id,invoice_number,invoice_date,due_date,status,customer_snap,grand_total,currency,created_by,created_at,source_quote_id FROM tax_invoices WHERE 1=1';
    const params = [];
    if (q)      { sql += ' AND (invoice_number LIKE ? OR customer_snap LIKE ?)'; params.push('%'+q+'%','%'+q+'%'); }
    if (status) { sql += ' AND status=?'; params.push(status); }
    if (from)   { sql += ' AND invoice_date >= ?'; params.push(from); }
    if (to)     { sql += ' AND invoice_date <= ?'; params.push(to); }
    sql += ' ORDER BY id DESC LIMIT 200';
    const rows = await db.query(sql, params);
    rows.forEach(r => {
      try { r.customer_snap = typeof r.customer_snap === 'string' ? JSON.parse(r.customer_snap) : r.customer_snap; }
      catch(e) { r.customer_snap = {}; }
    });
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Single invoice ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const inv = await db.getOne('SELECT * FROM tax_invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    try { inv.customer_snap = typeof inv.customer_snap === 'string' ? JSON.parse(inv.customer_snap) : inv.customer_snap; } catch(e) { inv.customer_snap = {}; }
    try { inv.from_snap     = typeof inv.from_snap === 'string'     ? JSON.parse(inv.from_snap)     : inv.from_snap;     } catch(e) { inv.from_snap = {}; }
    inv.items = await db.query('SELECT * FROM tax_invoice_items WHERE invoice_id=? ORDER BY sort_order', [inv.id]);
    res.json(inv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Create invoice ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const invoice_number = await nextInvoiceNumber();
    const [r] = await conn.execute(
      `INSERT INTO tax_invoices(invoice_number,invoice_date,supply_date,due_date,status,invoice_type,
       customer_id,customer_snap,from_snap,notes,footer_text,vat_pct,subtotal,vat_amount,
       grand_total,currency,bilingual,source_quote_id,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number,
       b.invoice_date || new Date().toISOString().slice(0,10),
       b.supply_date  || null,
       b.due_date     || null,
       b.status       || 'Draft',
       b.invoice_type || 'standard',
       b.customer_id  || null,
       JSON.stringify(b.customer_snap || {}),
       JSON.stringify(b.from_snap     || {}),
       b.notes        || '',
       b.footer_text  || '',
       b.vat_pct      || 15,
       b.subtotal     || 0,
       b.vat_amount   || 0,
       b.grand_total  || 0,
       b.currency     || 'SAR',
       b.bilingual    || 0,
       b.source_quote_id || null,
       req.user.name]
    );
    const iid = r.insertId;
    for (let i = 0; i < (b.items||[]).length; i++) {
      const it = b.items[i];
      await conn.execute(
        'INSERT INTO tax_invoice_items(invoice_id,sort_order,description,description_ar,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?)',
        [iid, i, it.description||'', it.description_ar||'', it.quantity||1, it.unit_price||0, it.line_total||0]
      );
    }
    await conn.commit(); conn.release();
    const full = await db.getOne('SELECT * FROM tax_invoices WHERE id=?', [iid]);
    try { full.customer_snap = JSON.parse(full.customer_snap); } catch(e) { full.customer_snap = {}; }
    try { full.from_snap     = JSON.parse(full.from_snap);     } catch(e) { full.from_snap = {}; }
    full.items = await db.query('SELECT * FROM tax_invoice_items WHERE invoice_id=? ORDER BY sort_order', [iid]);
    res.json(full);
  } catch(e) { await conn.rollback(); conn.release(); res.status(500).json({ error: e.message }); }
});

// ── Update invoice ────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body; const id = req.params.id;
    await conn.execute(
      `UPDATE tax_invoices SET invoice_date=?,supply_date=?,due_date=?,status=?,invoice_type=?,
       customer_id=?,customer_snap=?,from_snap=?,notes=?,footer_text=?,vat_pct=?,
       subtotal=?,vat_amount=?,grand_total=?,currency=?,bilingual=? WHERE id=?`,
      [b.invoice_date, b.supply_date||null, b.due_date||null, b.status||'Draft',
       b.invoice_type||'standard', b.customer_id||null,
       JSON.stringify(b.customer_snap||{}), JSON.stringify(b.from_snap||{}),
       b.notes||'', b.footer_text||'',
       b.vat_pct||15, b.subtotal||0, b.vat_amount||0, b.grand_total||0,
       b.currency||'SAR', b.bilingual||0, id]
    );
    await conn.execute('DELETE FROM tax_invoice_items WHERE invoice_id=?', [id]);
    for (let i = 0; i < (b.items||[]).length; i++) {
      const it = b.items[i];
      await conn.execute(
        'INSERT INTO tax_invoice_items(invoice_id,sort_order,description,description_ar,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?)',
        [id, i, it.description||'', it.description_ar||'', it.quantity||1, it.unit_price||0, it.line_total||0]
      );
    }
    await conn.commit(); conn.release();
    res.json({ ok: true });
  } catch(e) { await conn.rollback(); conn.release(); res.status(500).json({ error: e.message }); }
});

// ── Patch status ──────────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('UPDATE tax_invoices SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Duplicate ─────────────────────────────────────────────────────────────
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const orig  = await db.getOne('SELECT * FROM tax_invoices WHERE id=?', [req.params.id]);
    if (!orig) return res.status(404).json({ error: 'Not found' });
    const items = await db.query('SELECT * FROM tax_invoice_items WHERE invoice_id=? ORDER BY sort_order', [orig.id]);
    const invoice_number = await nextInvoiceNumber();
    const today = new Date().toISOString().slice(0,10);
    const [r] = await db.pool.execute(
      `INSERT INTO tax_invoices(invoice_number,invoice_date,supply_date,due_date,status,invoice_type,
       customer_id,customer_snap,from_snap,notes,footer_text,vat_pct,subtotal,vat_amount,
       grand_total,currency,bilingual,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, today, orig.supply_date, orig.due_date, 'Draft', orig.invoice_type,
       orig.customer_id, orig.customer_snap, orig.from_snap, orig.notes, orig.footer_text,
       orig.vat_pct, orig.subtotal, orig.vat_amount, orig.grand_total, orig.currency,
       orig.bilingual, req.user.name]
    );
    const newId = r.insertId;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await db.pool.execute(
        'INSERT INTO tax_invoice_items(invoice_id,sort_order,description,description_ar,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?)',
        [newId, it.sort_order, it.description, it.description_ar||'', it.quantity, it.unit_price, it.line_total]
      );
    }
    res.json({ id: newId, invoice_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Convert from quotation ────────────────────────────────────────────────
router.post('/from-quote/:quoteId', requireAuth, async (req, res) => {
  try {
    const qt = require('../db');
    const quote = await db.getOne('SELECT * FROM quotations WHERE id=?', [req.params.quoteId]);
    if (!quote) return res.status(404).json({ error: 'Quotation not found' });
    const qItems = await db.query('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sort_order', [quote.id]);
    const invoice_number = await nextInvoiceNumber();
    const today = new Date().toISOString().slice(0,10);
    const [r] = await db.pool.execute(
      `INSERT INTO tax_invoices(invoice_number,invoice_date,status,invoice_type,customer_id,
       customer_snap,from_snap,notes,footer_text,vat_pct,subtotal,vat_amount,grand_total,
       currency,bilingual,source_quote_id,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, today, 'Draft', 'standard', quote.customer_id,
       quote.customer_snap, quote.from_snap, quote.notes||'', quote.footer_text||'',
       quote.vat_pct, quote.subtotal, quote.vat_amount, quote.grand_total,
       quote.currency||'SAR', quote.bilingual||0, quote.id, req.user.name]
    );
    const newId = r.insertId;
    for (let i = 0; i < qItems.length; i++) {
      const it = qItems[i];
      await db.pool.execute(
        'INSERT INTO tax_invoice_items(invoice_id,sort_order,description,description_ar,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?)',
        [newId, it.sort_order, it.description||'', it.description_ar||'', it.quantity, it.unit_price, it.line_total]
      );
    }
    res.json({ id: newId, invoice_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Delete ────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.pool.execute('DELETE FROM tax_invoices WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
