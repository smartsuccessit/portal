'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const MANAGERS = ['Shahzaib','Riyad'];

router.get('/', requireAuth, async (req, res) => {
  try { res.json(await db.query('SELECT * FROM tasks ORDER BY created_at DESC')); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, assigned_to, priority='m', status='todo', due_date=null, notes='' } = req.body;
    if (!title||!assigned_to) return res.status(400).json({ error: 'Missing fields' });
    const [r] = await db.pool.execute(
      'INSERT INTO tasks(title,assigned_to,priority,status,due_date,notes,created_by) VALUES(?,?,?,?,?,?,?)',
      [title,assigned_to,priority,status,due_date||null,notes,req.user.name]
    );
    res.json(await db.getOne('SELECT * FROM tasks WHERE id=?', [r.insertId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, assigned_to, priority, status, due_date=null, notes='' } = req.body;
    await db.pool.execute(
      'UPDATE tasks SET title=?,assigned_to=?,priority=?,status=?,due_date=?,notes=? WHERE id=?',
      [title,assigned_to,priority,status,due_date||null,notes,req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!MANAGERS.includes(req.user.name)) return res.status(403).json({ error: 'Managers only' });
    await db.pool.execute('DELETE FROM tasks WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
