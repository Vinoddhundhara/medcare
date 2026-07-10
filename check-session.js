import { Pool } from 'pg';
import "dotenv/config";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM session LIMIT 1')
  .then(res => { console.log('session exists', res.rows); pool.end(); })
  .catch(err => { console.error('Error querying session:', err); pool.end(); });
