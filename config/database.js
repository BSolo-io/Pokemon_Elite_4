// config/database.js
// One shared connection pool for the whole app.
// Every file that needs the database imports THIS, not `pg` directly —
// that way there's exactly one pool, not one per file.

import pg from "pg";
import dotenv from "dotenv";

// Reads the .env file and puts its values into process.env
dotenv.config();

const { Pool } = pg;

// Render requires an encrypted (SSL) connection. A database running on your
// own laptop does not, and will reject the attempt. So: turn SSL on unless
// the connection string points at localhost.
const isLocal =
  process.env.DATABASE_URL?.includes("localhost") ||
  process.env.DATABASE_URL?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export default pool;
