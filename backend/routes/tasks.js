'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/',    requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM tasks ORDER BY created_at DESC')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/',   requireAuth, async (req, res) => {
  try {
    const { title, description='', assigned_to='', priority='medium', due_date=null, status='pending' } = req.body;
    const [r] = await db.pool.execute(
      'INSERT INTO tasks(title,description,assigned_to,priority,due_date,status,created_by) VALUES(?,?,?,?,?,?,?)',
      [title, description, assigned_to, priority, due_date, status, req.user.name]
    );
    res.json(await db.getOne('SELECT * FROM tasks WHERE id=?', [r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, assigned_to, priority, due_date, status } = req.body;
    await db.pool.execute(
      'UPDATE tasks SET title=?,description=?,assigned_to=?,priority=?,due_date=?,status=? WHERE id=?',
      [title, description||'', assigned_to||'', priority||'medium', due_date||null, status||'pending', req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.delete('/:id', requireAuth, async (req, res) => {
  try { await db.pool.execute('DELETE FROM tasks WHERE id=?', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
