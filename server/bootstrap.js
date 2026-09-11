import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeSchema() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'shadow',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    const schemaPath = path.resolve(__dirname, '../database/mysql/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8').replace(/^\s*--.*$/gm, '');
    const statements = schema
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    const connection = await pool.getConnection();
    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
    } finally {
      connection.release();
    }

    console.log(`[DB-INIT] Schema ready (${statements.length} statements).`);
  } finally {
    await pool.end();
  }
}

try {
  await initializeSchema();
  await import('./index.js');
} catch (error) {
  console.error('[BOOT] Startup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
