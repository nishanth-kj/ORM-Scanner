import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

async function fixDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Creating public schema if not exists...");
    await pool.query('CREATE SCHEMA IF NOT EXISTS public;');
    console.log("Public schema successfully created!");
  } catch (error) {
    console.error("Failed to create public schema:", error);
  } finally {
    await pool.end();
  }
}

fixDb();
