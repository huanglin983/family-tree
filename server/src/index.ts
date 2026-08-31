/**
 * Express 应用入口
 * 分层：接入层；创建时间：2026-03-28
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { authRouter } from './routes/auth.js';
import {
  familyRouter,
  membersRouter,
  relationshipsRouter,
  treeRouter,
} from './routes/members.js';
import { backupRouter, eventsRouter, photosRouter } from './routes/content.js';

export function createApp() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });
  migrate();
  seed(false);

  // 占位图
  const placeholder = path.join(config.uploadDir, 'placeholder-family.svg');
  if (!fs.existsSync(placeholder)) {
    fs.writeFileSync(
      placeholder,
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#e8e2d6" width="400" height="300"/>
  <text x="200" y="150" text-anchor="middle" fill="#6b5e4f" font-family="sans-serif" font-size="20">家族合影占位</text>
</svg>`,
      'utf8'
    );
  }

  const app = express();
  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/uploads', express.static(config.uploadDir));

  app.get('/api/health', (_req, res) => {
    try {
      getDb().prepare('SELECT 1 AS ok').get();
      res.json({ ok: true, db: true });
    } catch (e) {
      res.status(500).json({
        ok: false,
        db: false,
        error: e instanceof Error ? e.message : 'db error',
      });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/family', familyRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/tree', treeRouter);
  app.use('/api/relationships', relationshipsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/photos', photosRouter);
  app.use('/api/backup', backupRouter);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: err.message || '服务器错误' });
    }
  );

  return app;
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
const self = path.resolve(fileURLToPath(import.meta.url));
if (entry === self) {
  const app = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`Family tree API http://${config.host}:${config.port}`);
  });
}
