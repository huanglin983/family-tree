/**
 * 配置层：环境变量与路径
 * 创建时间：2026-03-28
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT || 3100),
  host: process.env.HOST || '127.0.0.1',
  dataDir: process.env.DATA_DIR || path.join(serverRoot, 'data'),
  uploadDir: process.env.UPLOAD_DIR || path.join(serverRoot, 'uploads'),
  dbPath: process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(serverRoot, 'data'), 'family.db'),
  sessionSecret: process.env.SESSION_SECRET || 'family-tree-dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || 'admin123',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
  isProd: process.env.NODE_ENV === 'production',
  serverRoot,
};
