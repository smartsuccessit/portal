/**
 * Smart Success Portal — Database Setup
 * Run once: node backend/setup.js
 * This creates all tables and seeds default data.
 */
'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch(e) {}
console.log('[Setup] DB config:', process.env.DB_HOST, process.env.DB_NAME, process.env.DB_USER);
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const cfg = {
  host:     process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'smart_success',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  multipleStatements: true,
  charset: 'utf8mb4',
};

async function setup() {
  const conn = await mysql.createConnection(cfg);
  console.log('[Setup] Connected to MySQL');

  // ── Create tables ─────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100) NOT NULL UNIQUE,
      name_ar     VARCHAR(200) NOT NULL DEFAULT '',
      initials    VARCHAR(5)   NOT NULL,
      color       VARCHAR(20)  NOT NULL DEFAULT '#1e2d4a',
      role        VARCHAR(200) NOT NULL,
      pin_hash    VARCHAR(255) NOT NULL,
      is_admin    TINYINT(1)   NOT NULL DEFAULT 0,
      is_approver TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS app_access (
      user_id INT         NOT NULL,
      app_id  VARCHAR(50) NOT NULL,
      PRIMARY KEY (user_id, app_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS settings (
      \`key\`   VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT         NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS pc_categories (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      type    ENUM('in','out') NOT NULL,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL,
      sort    INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS petty_cash (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      type         ENUM('in','out') NOT NULL,
      amount       DECIMAL(12,2)    NOT NULL,
      category     VARCHAR(200)     NOT NULL,
      description  TEXT             NOT NULL,
      note         TEXT,
      entered_by   VARCHAR(100)     NOT NULL,
      entry_date   DATETIME         NOT NULL,
      approved     TINYINT(1)       NOT NULL DEFAULT 0,
      approved_by  VARCHAR(100)     NOT NULL DEFAULT '',
      approved_at  DATETIME         NULL,
      pend_delete  TINYINT(1)       NOT NULL DEFAULT 0,
      del_req_by   VARCHAR(100)     NOT NULL DEFAULT '',
      created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_entry_date (entry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS tasks (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      title       VARCHAR(500) NOT NULL,
      assigned_to VARCHAR(100) NOT NULL,
      priority    ENUM('h','m','l') NOT NULL DEFAULT 'm',
      status      ENUM('todo','prog','done') NOT NULL DEFAULT 'todo',
      due_date    DATE         NULL,
      notes       TEXT,
      created_by  VARCHAR(100) NOT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS daily_entries (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      report_date DATE         NOT NULL,
      section     ENUM('cust','purch','exp') NOT NULL,
      member      VARCHAR(100) NOT NULL,
      amount      DECIMAL(12,2) NOT NULL,
      method      ENUM('cash','card') NOT NULL,
      note        TEXT,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_report_date (report_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS daily_meta (
      report_date DATE    PRIMARY KEY,
      quotations  INT     NOT NULL DEFAULT 0,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[Setup] Tables created');

  // ── Seed users ────────────────────────────────────────────────────────
  const defaults = [
    { name:'Shahzaib', name_ar:'\u0634\u0647\u0632\u064a\u0628',  ini:'SZ', color:'#1e2d4a', role:'Senior IT Engineer',    pin:'1234', admin:1, approver:0 },
    { name:'Riyad',    name_ar:'\u0631\u064a\u0627\u0636',         ini:'RI', color:'#2c5f8a', role:'General Manager',        pin:'2345', admin:0, approver:1 },
    { name:'Azzam',    name_ar:'\u0639\u0632\u0627\u0645',         ini:'AZ', color:'#1a5c3a', role:'Shop Operations',        pin:'3456', admin:0, approver:0 },
    { name:'Hussam',   name_ar:'\u062d\u0633\u0627\u0645',         ini:'HU', color:'#7a3a1a', role:'Field Technician',       pin:'4567', admin:0, approver:0 },
    { name:'Shahdat',  name_ar:'\u0634\u0647\u062f\u0627\u062a',   ini:'SD', color:'#5a2a7a', role:'Sales Representative',   pin:'5678', admin:0, approver:0 },
  ];

  const allApps = ['petty-cash','daily-report','tasks','roles','profile'];

  for (const u of defaults) {
    const [existing] = await conn.execute('SELECT id FROM users WHERE name=?', [u.name]);
    if (existing.length) { console.log(`[Setup] User exists: ${u.name}`); continue; }

    const hash = bcrypt.hashSync(u.pin, 10);
    const [r]  = await conn.execute(
      'INSERT INTO users(name,name_ar,initials,color,role,pin_hash,is_admin,is_approver) VALUES(?,?,?,?,?,?,?,?)',
      [u.name, u.name_ar, u.ini, u.color, u.role, hash, u.admin, u.approver]
    );
    const uid = r.insertId;
    for (const app of allApps) {
      await conn.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [uid, app]);
    }
    if (u.admin) {
      await conn.execute('INSERT IGNORE INTO app_access VALUES(?,?)', [uid, 'control-panel']);
    }
    console.log(`[Setup] Created user: ${u.name}`);
  }

  // ── Seed settings ─────────────────────────────────────────────────────
  await conn.execute('INSERT IGNORE INTO settings VALUES(?,?)', ['approver','Riyad']);
  await conn.execute('INSERT IGNORE INTO settings VALUES(?,?)', ['deleter','Riyad']);

  // ── Seed categories ───────────────────────────────────────────────────
  const [catCheck] = await conn.execute('SELECT COUNT(*) as c FROM pc_categories');
  if (catCheck[0].c === 0) {
    const inCats = [
      ['Float Top-up',     '\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0635\u0646\u062f\u0648\u0642'],
      ['Sales Cash',       '\u0646\u0642\u062f \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a'],
      ['Customer Payment', '\u062f\u0641\u0639\u0629 \u0639\u0645\u064a\u0644'],
      ['Refund Received',  '\u0627\u0633\u062a\u0631\u062f\u0627\u062f'],
    ];
    const outCats = [
      ['Office Supplies',  '\u0645\u0633\u062a\u0644\u0632\u0645\u0627\u062a \u0645\u0643\u062a\u0628\u064a\u0629'],
      ['Transport',        '\u0645\u0648\u0627\u0635\u0644\u0627\u062a'],
      ['Meals',            '\u0648\u062c\u0628\u0627\u062a'],
      ['Equipment',        '\u0645\u0639\u062f\u0627\u062a'],
      ['Repairs',          '\u0635\u064a\u0627\u0646\u0629'],
      ['Utilities',        '\u062e\u062f\u0645\u0627\u062a'],
      ['Miscellaneous',    '\u0645\u062a\u0646\u0648\u0639\u0627\u062a'],
    ];
    for (let i=0; i<inCats.length; i++)  await conn.execute('INSERT INTO pc_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)', ['in', ...inCats[i], i]);
    for (let i=0; i<outCats.length; i++) await conn.execute('INSERT INTO pc_categories(type,name_en,name_ar,sort) VALUES(?,?,?,?)', ['out',...outCats[i],i]);
    console.log('[Setup] Categories seeded');
  }

  await conn.end();
  console.log('\n[Setup] Done! Database is ready.');
  console.log('[Setup] Run: npm start');
}

setup().catch(e => { console.error('[Setup] Error:', e.message); process.exit(1); });
