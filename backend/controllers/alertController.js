import { pool } from '../db.js';

export async function getAlerts(req, res) {
  const result = await pool.query('SELECT * FROM alerts ORDER BY timestamp');

  // Normalize keys to match frontend type expectations (camelCase)
  const normalized = result.rows.map(row => ({
    ...row,
    frameUrl: row.frameurl, // map DB key to TS field
  }));

  res.json(normalized);
}


export async function createAlert(req, res) {
  const { timestamp, type, message, details, frameUrl } = req.body;
  const result = await pool.query(
    'INSERT INTO alerts (timestamp, type, message, details, frameUrl) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [timestamp, type, message, details, frameUrl]
  );
  res.status(201).json(result.rows[0]);
}
