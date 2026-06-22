import { Pool } from 'pg';
import dotenv from 'dotenv';
import type { TelemetryPayload } from '../types/index.types.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

// Catch background TCP drops so they don't crash the Node.js process
pool.on('error', (err, client) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
  // We do NOT throw here. The pool will automatically destroy the dead client 
  // and create a fresh one the next time we need to flush telemetry.
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('[DB] Initializing PostgreSQL Schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        mode VARCHAR(20) NOT NULL,
        payload JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_logs USING btree (timestamp);
    `);
    console.log('[DB] Schema ready. B-Tree Index active.');
  } finally {
    client.release();
  }
};

// The 5-Second Bulk Insert
export const flushTelemetryToDB = async (buffer: TelemetryPayload[], mode: string) => {
  if (buffer.length === 0) return;

  const client = await pool.connect();
  try {
    const values: any[] = [];
    const placeholders: string[] = [];
    
    let paramIndex = 1;
    buffer.forEach((data) => {
      placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      values.push(data.timestamp, mode, data);
    });

    const query = `INSERT INTO telemetry_logs (timestamp, mode, payload) VALUES ${placeholders.join(', ')}`;
    await client.query(query, values);
    
  } catch (err) {
    console.error('[DB] Failed to flush telemetry buffer:', err);
  } finally {
    client.release();
  }
};

// The 24-Hour Janitor
export const cleanOldData = async () => {
  try {
    const res = await pool.query(`DELETE FROM telemetry_logs WHERE timestamp < NOW() - INTERVAL '24 hours'`);
    if (res.rowCount && res.rowCount > 0) {
      console.log(`[DB Janitor] Purged ${res.rowCount} old telemetry rows.`);
    }
  } catch (err) {
    console.error('[DB Janitor] Failed to clean old data:', err);
  }
};

// server/src/db/index.db.ts
export const getHistoricalTelemetry = async (hours: number, endTime?: string) => {
  const client = await pool.connect();
  try {
    // CRITICAL FIX: Use the anchor time if provided, otherwise default to right NOW
    const anchor = endTime ? endTime : new Date().toISOString();

    const query = hours > 1 
      ? `
        SELECT DISTINCT ON (date_trunc('minute', timestamp)) 
          timestamp, payload 
        FROM telemetry_logs 
        WHERE timestamp >= $2::timestamp - $1::interval
        AND timestamp <= $2::timestamp
        AND mode = 'live'
        ORDER BY date_trunc('minute', timestamp) ASC, (payload->'timeSeries'->>'cpuPercent')::numeric DESC
      `
      : `
        SELECT timestamp, payload 
        FROM telemetry_logs 
        WHERE timestamp >= $2::timestamp - $1::interval
        AND timestamp <= $2::timestamp
        AND mode = 'live'
        ORDER BY timestamp ASC
      `;

    // We pass both the duration ($1) and the anchor time ($2)
    const result = await client.query(query, [`${hours} hours`, anchor]);
    return result.rows;
  } catch (err) {
    console.error('[DB] Failed to fetch historical data:', err);
    throw err;
  } finally {
    client.release();
  }
};