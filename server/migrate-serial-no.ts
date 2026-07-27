import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE answer_sheet ALTER COLUMN booklet_serial_no TYPE varchar(7)');
    console.log('✅ Migration successful: booklet_serial_no is now varchar(7)');
    
    // Verify
    const res = await client.query(`
      SELECT character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'answer_sheet' AND column_name = 'booklet_serial_no'
    `);
    console.log('Column length after migration:', res.rows[0]?.character_maximum_length);
  } catch (e: any) {
    if (e.message.includes('already')) {
      console.log('✅ Column already at varchar(7) or larger, nothing to do.');
    } else {
      console.error('❌ Migration failed:', e.message);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
