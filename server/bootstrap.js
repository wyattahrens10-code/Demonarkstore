import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) return;

  const required = [
    'ADMIN_JWT_SECRET',
    'TIP4SERV_API_KEY',
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
  ];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variable(s): ${missing.join(', ')}`);
  }
}

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
  validateProductionEnvironment();
  await initializeSchema();
  await import('./index.js');
} catch (error) {
  console.error('[BOOT] Startup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
