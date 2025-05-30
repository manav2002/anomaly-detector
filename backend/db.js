import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

// export const pool = new Pool({
//   host: process.env.PGHOST,
//   user: process.env.PGUSER,
//   password: process.env.PGPASSWORD,
//   database: process.env.PGDATABASE,
//   port: process.env.PGPORT,
// });




export const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false, // allow self-signed cert from AWS
  },
});

pool.query(`
  CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP,
    type TEXT,
    message TEXT,
    details TEXT,
    frameurl TEXT
  );
`, (err, res) => {
  if (err) {
    console.error("❌ Failed to create alerts table:", err);
  } else {
    console.log("✅ alerts table ready");
  }
});


