/**
 * 执行 schema 迁移
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { getDb, closeDb } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveSchemaPath(): string {
  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(config.serverRoot, 'src', 'db', 'schema.sql'),
    path.join(config.serverRoot, 'dist', 'db', 'schema.sql'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('schema.sql not found');
}

export function migrate(): void {
  const sql = fs.readFileSync(resolveSchemaPath(), 'utf8');
  const db = getDb();
  db.exec(sql);
  // 存量库补列（新建表已含该列时会忽略错误）
  try {
    db.exec(`ALTER TABLE events ADD COLUMN image_urls TEXT DEFAULT '[]'`);
  } catch {
    /* column already exists */
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
const self = path.resolve(fileURLToPath(import.meta.url));
if (entry === self) {
  migrate();
  console.log('Migration completed');
  closeDb();
}
