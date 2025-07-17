const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  try {
    const sqlFile = path.join(__dirname, 'create-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    await pool.query(sql);
    console.log('Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDb();
