'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch(e) {}
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:       parseInt(process.env.DB_PORT   || '3306'),
  database:          process.env.DB_NAME     || 'smart_success',
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:           'utf8mb4',
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { pool, query, getOne };
