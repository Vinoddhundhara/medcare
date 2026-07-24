require('dotenv').config();
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');
const { Pool } = require('pg');
const scryptAsync = promisify(scrypt);

async function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(pw, salt, 64);
  return buf.toString('hex') + '.' + salt;
}

async function main() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  try {
    const { rows } = await pool.query('SELECT id, name, password FROM hospitals');
    for (const row of rows) {
      if (!row.password || !row.password.includes('.')) {
        const hashed = await hashPassword('password123');
        await pool.query('UPDATE hospitals SET password=$1 WHERE id=$2', [hashed, row.id]);
        console.log('Password set for:', row.name);
      } else {
        console.log('Already has password:', row.name);
      }
    }
    console.log('Done');
  } finally {
    pool.end();
  }
}

main().catch(console.error);
