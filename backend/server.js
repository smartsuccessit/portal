'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch(e) {}
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  process.stdout.write(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}\n`);
  next();
});

app.use('/api/users',        require('./routes/users'));
app.use('/api/petty-cash',   require('./routes/petty-cash'));
app.use('/api/tasks',        require('./routes/tasks'));
app.use('/api/daily-report', require('./routes/daily-report'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api',              require('./routes/extras'));
app.get('/api/health',       (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

const PORT = process.env.PORT || 3000;

// ── Inline database setup ─────────────────────────────────────────────────
async function runSetup() {
  const cfg = {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'smart_success',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  };

  console.log('[Setup] Connecting:', cfg.host, cfg.database, cfg.user);
  const conn = await mysql.createConnection(cfg);
  console.log('[Setup] Connected to MySQL');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      name_ar VARCHAR(200) NOT NULL DEFAULT '',
      initials VARCHAR(5) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#1e2d4a',
      role VARCHAR(200) NOT NULL,
      pin_hash VARCHAR(255) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      is_approver TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS app_access (
      user_id INT NOT NULL,
      app_id VARCHAR(50) NOT NULL,
      PRIMARY KEY (user_id, app_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS pc_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('in','out') NOT NULL,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL,
      sort INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS petty_cash (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('in','out') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      note TEXT,
      entered_by VARCHAR(100) NOT NULL,
      entry_date DATETIME NOT NULL,
      approved TINYINT(1) NOT NULL DEFAULT 0,
      approved_by VARCHAR(100) NOT NULL DEFAULT '',
      approved_at DATETIME NULL,
      pend_delete TINYINT(1) NOT NULL DEFAULT 0,
      del_req_by VARCHAR(100) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      assigned_to VARCHAR(100) NOT NULL,
      priority ENUM('h','m','l') NOT NULL DEFAULT 'm',
      status ENUM('todo','prog','done') NOT NULL DEFAULT 'todo',
      due_date DATE NULL,
      notes TEXT,
      created_by VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS daily_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_date DATE NOT NULL,
      section ENUM('cust','purch','exp') NOT NULL,
      member VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      method ENUM('cash','card') NOT NULL,
      note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_report_date (report_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS daily_meta (
      report_date DATE PRIMARY KEY,
      quotations INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS rb_categories (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL DEFAULT '',
      sort    INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS pl_categories (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      type    ENUM('income','expense') NOT NULL,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL DEFAULT '',
      sort    INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS pl_entries (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      type        ENUM('income','expense') NOT NULL,
      month       INT NOT NULL,
      year        INT NOT NULL,
      category    VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      amount      DECIMAL(12,2) NOT NULL,
      note        TEXT,
      entered_by  VARCHAR(100) NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pl_year_month (year, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS money_ledger (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      type        ENUM('gave','received','lent','borrowed') NOT NULL,
      person      VARCHAR(200) NOT NULL,
      amount      DECIMAL(12,2) NOT NULL,
      entry_date  DATE NOT NULL,
      note        TEXT,
      settled     TINYINT(1) NOT NULL DEFAULT 0,
      entered_by  VARCHAR(100) NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ml_person (person)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS reimbursements (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      paid_by          VARCHAR(200) NOT NULL,
      amount           DECIMAL(12,2) NOT NULL,
      category         VARCHAR(200) NOT NULL DEFAULT '',
      description      TEXT NOT NULL,
      paid_date        DATE NOT NULL,
      reference        VARCHAR(200) NOT NULL DEFAULT '',
      entered_by       VARCHAR(100) NOT NULL,
      repaid           TINYINT(1) NOT NULL DEFAULT 0,
      repaid_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
      repaid_method    VARCHAR(100) NOT NULL DEFAULT '',
      repaid_date      DATE NULL,
      repaid_note      TEXT,
      repaid_by        VARCHAR(100) NOT NULL DEFAULT '',
      pending_approval TINYINT(1) NOT NULL DEFAULT 0,
      req_by           VARCHAR(100) NOT NULL DEFAULT '',
      created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id     INT NOT NULL,
      amount         DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(100) NOT NULL DEFAULT 'Bank Transfer',
      payment_date   DATE NOT NULL,
      reference      VARCHAR(200) NOT NULL DEFAULT '',
      recorded_by    VARCHAR(100) NOT NULL,
      created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inv_pay (invoice_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS invoices (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      direction         ENUM('outgoing','incoming') NOT NULL,
      invoice_number    VARCHAR(100) NOT NULL DEFAULT '',
      party_name        VARCHAR(200) NOT NULL,
      total_amount      DECIMAL(12,2) NOT NULL,
      paid_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_method    VARCHAR(100) NOT NULL DEFAULT 'Bank Transfer',
      issue_date        DATE NOT NULL,
      due_date          DATE NULL,
      notes             TEXT,
      entered_by        VARCHAR(100) NOT NULL,
      last_payment_date   DATE NULL,
      payment_ref         VARCHAR(200) NOT NULL DEFAULT '',
      payment_requested   TINYINT(1) NOT NULL DEFAULT 0,
      req_by              VARCHAR(100) NOT NULL DEFAULT '',
      created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inv_direction (direction),
      INDEX idx_inv_due (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[Setup] Tables created');

  const defaultUsers = [
    { name:'Shahzaib', name_ar:'\u0634\u0647\u0632\u064a\u0628',  ini:'SZ', color:'#1e2d4a', role:'Senior IT Engineer',   pin:'1234', admin:1, approver:0 },
    { name:'Riyad',    name_ar:'\u0631\u064a\u0627\u0636',         ini:'RI', color:'#2c5f8a', role:'General Manager',       pin:'2345', admin:0, approver:1 },
    { name:'Azzam',    name_ar:'\u0639\u0632\u0627\u0645',         ini:'AZ', color:'#1a5c3a', role:'Shop Operations',       pin:'3456', admin:0, approver:0 },
    { name:'Hussam',   name_ar:'\u062d\u0633\u0627\u0645',         ini:'HU', color:'#7a3a1a', role:'Field Technician',      pin:'4567', admin:0, approver:0 },
    { name:'Shahdat',  name_ar:'\u0634\u0647\u062f\u0627\u062a',   ini:'SD', color:'#5a2a7a', role:'Sales Representative',  pin:'5678', admin:0, approver:0 },
  ];
  const allApps = ['petty-cash','daily-report','tasks','roles','profile','pl-report','money-ledger','reimbursements','invoices'];
  for (const u of defaultUsers) {
    const [ex] = await conn.execute('SELECT id FROM users WHERE name=?', [u.name]);
    if (ex.length) { console.log('[Setup] Exists:', u.name); continue; }
    const hash = bcrypt.hashSync(u.pin, 10);
    const [r]  = await conn.execute(
      'INSERT INTO users(name,name_ar,initials,color,role,pin_hash,is_admin,is_approver) VALUES(?,?,?,?,?,?,?,?)',
      [u.name, u.name_ar, u.ini, u.color, u.role, hash, u.admin, u.approver]
    );
    for (const app of allApps) await conn.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [r.insertId, app]);
    if (u.admin) await conn.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [r.insertId, 'control-panel']);
    console.log('[Setup] Created user:', u.name);
  }

  await conn.execute('INSERT IGNORE INTO settings VALUES(?,?)', ['approver','Riyad']);
  await conn.execute('INSERT IGNORE INTO settings VALUES(?,?)', ['deleter','Riyad']);

  const [cc] = await conn.execute('SELECT COUNT(*) as c FROM pc_categories');
  if (cc[0].c === 0) {
    const inCats  = [['Float Top-up','\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0635\u0646\u062f\u0648\u0642'],['Sales Cash','\u0646\u0642\u062f \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a'],['Customer Payment','\u062f\u0641\u0639\u0629 \u0639\u0645\u064a\u0644'],['Refund Received','\u0627\u0633\u062a\u0631\u062f\u0627\u062f']];
    const outCats = [['Office Supplies','\u0645\u0633\u062a\u0644\u0632\u0645\u0627\u062a \u0645\u0643\u062a\u0628\u064a\u0629'],['Transport','\u0645\u0648\u0627\u0635\u0644\u0627\u062a'],['Meals','\u0648\u062c\u0628\u0627\u062a'],['Equipment','\u0645\u0639\u062f\u0627\u062a'],['Repairs','\u0635\u064a\u0627\u0646\u0629'],['Utilities','\u062e\u062f\u0645\u0627\u062a'],['Miscellaneous','\u0645\u062a\u0646\u0648\u0639\u0627\u062a']];
    for (let i=0;i<inCats.length;i++)  await conn.execute('INSERT INTO pc_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)',['in', ...inCats[i], i]);
    for (let i=0;i<outCats.length;i++) await conn.execute('INSERT INTO pc_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)',['out',...outCats[i],i]);
    console.log('[Setup] Categories seeded');
  }

  await conn.end();
  // Seed default Reimbursement categories
  const [rbCatCount] = await conn.execute('SELECT COUNT(*) as c FROM rb_categories');
  if (rbCatCount[0].c === 0) {
    const rbCats = [['Office Supplies','مستلزمات مكتبية'],['Transport','مواصلات'],['Meals','وجبات'],
      ['Equipment','معدات'],['Repairs','صيانة'],['Utilities','خدمات'],
      ['Client Entertainment','ضيافة العملاء'],['Other','أخرى']];
    for(let i=0;i<rbCats.length;i++) await conn.execute('INSERT INTO rb_categories(name_en,name_ar,sort) VALUES(?,?,?)',[...rbCats[i],i]);
    console.log('[Setup] Reimbursement categories seeded');
  }

  // Seed default P&L categories
  const [plCatCount] = await conn.execute('SELECT COUNT(*) as c FROM pl_categories');
  if (plCatCount[0].c === 0) {
    const incCats = [['Product Sales','مبيعات المنتجات'],['Service Revenue','إيرادات الخدمات'],['Consulting','استشارات'],['Commission','عمولات'],['Other Income','إيرادات أخرى']];
    const expCats = [['Cost of Goods','تكلفة البضاعة'],['Rent','إيجار'],['Salaries','رواتب'],['Utilities','خدمات'],['Transport','مواصلات'],['Marketing','تسويق'],['Maintenance','صيانة'],['Supplies','مستلزمات'],['Other Expense','مصاريف أخرى']];
    for(let i=0;i<incCats.length;i++) await conn.execute('INSERT INTO pl_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)',['income',...incCats[i],i]);
    for(let i=0;i<expCats.length;i++) await conn.execute('INSERT INTO pl_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)',['expense',...expCats[i],i]);
    console.log('[Setup] P&L categories seeded');
  }

  // Grant new apps to ALL existing users who don't have them yet
  const newApps = ['pl-report','money-ledger','reimbursements','invoices'];
  const allUsers2 = await conn.execute('SELECT id FROM users');
  for (const u of allUsers2[0]) {
    for (const app of newApps) {
      await conn.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [u.id, app]);
    }
  }
  console.log('[Setup] New app access granted to all existing users');

  console.log('[Setup] Done!');
}

// ── Start server ──────────────────────────────────────────────────────────
async function startServer() {
  try {
    await runSetup();
  } catch(e) {
    console.error('[Setup] FAILED:', e.message);
    console.error('[Setup] Env:', process.env.DB_HOST, process.env.DB_NAME, process.env.DB_USER);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Smart Success Portal running on port ${PORT}\n`);
  });
}

startServer();
module.exports = app;
