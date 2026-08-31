/**
 * 事件 / 照片 / 备份路由
 */
import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  createEvent,
  createPhoto,
  deleteEvent,
  deletePhoto,
  exportBackup,
  importBackup,
  listEvents,
  listPhotos,
  updateEvent,
  updatePhoto,
} from '../services/content.js';

export const eventsRouter = Router();
export const photosRouter = Router();
export const backupRouter = Router();

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowed.includes(ext)) {
      cb(new Error('仅支持 jpg/png/webp'), '');
      return;
    }
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 12 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('仅支持 jpg/png/webp'));
  },
});

function parseKeepUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.filter((u): u is string => typeof u === 'string');
    } catch {
      /* ignore */
    }
  }
  return [];
}

eventsRouter.get('/', (_req, res) => {
  res.json(listEvents());
});

eventsRouter.post('/', requireAuth, (req, res) => {
  upload.array('images', 12)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || '上传失败' });
      return;
    }
    try {
      const title = req.body?.title;
      if (!title) {
        res.status(400).json({ error: '标题必填' });
        return;
      }
      const keep = parseKeepUrls(req.body?.image_urls);
      const uploaded = (req.files as Express.Multer.File[] | undefined)?.map(
        (f) => `/uploads/${f.filename}`
      ) || [];
      res.status(201).json(
        createEvent({
          title,
          event_type: req.body?.event_type,
          event_date: req.body?.event_date,
          description: req.body?.description,
          image_urls: [...keep, ...uploaded],
        })
      );
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '创建失败' });
    }
  });
});

eventsRouter.put('/:id', requireAuth, (req, res) => {
  upload.array('images', 12)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || '上传失败' });
      return;
    }
    try {
      const keep = parseKeepUrls(req.body?.image_urls);
      const uploaded = (req.files as Express.Multer.File[] | undefined)?.map(
        (f) => `/uploads/${f.filename}`
      ) || [];
      const body: Record<string, unknown> = {
        title: req.body?.title,
        event_type: req.body?.event_type,
        event_date: req.body?.event_date,
        description: req.body?.description,
      };
      // 仅当明确传了 image_urls 或有新文件时更新图片
      if (req.body?.image_urls !== undefined || uploaded.length) {
        body.image_urls = [...keep, ...uploaded];
      }
      res.json(updateEvent(Number(req.params.id), body));
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' });
    }
  });
});

eventsRouter.delete('/:id', requireAuth, (req, res) => {
  try {
    deleteEvent(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '删除失败' });
  }
});

photosRouter.get('/', (_req, res) => {
  res.json(listPhotos());
});

photosRouter.post('/', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || '上传失败' });
      return;
    }
    try {
      const file = req.file;
      const url = req.body?.url || (file ? `/uploads/${file.filename}` : '');
      if (!url) {
        res.status(400).json({ error: '请上传文件或提供 url' });
        return;
      }
      const member_id =
        req.body?.member_id === '' || req.body?.member_id == null
          ? null
          : Number(req.body.member_id);
      res.status(201).json(
        createPhoto({
          title: req.body?.title,
          url,
          description: req.body?.description,
          taken_at: req.body?.taken_at,
          member_id: Number.isFinite(member_id as number) ? member_id : null,
        })
      );
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '创建失败' });
    }
  });
});

photosRouter.put('/:id', requireAuth, (req, res) => {
  try {
    const body = { ...req.body };
    if (body.member_id === '') body.member_id = null;
    if (body.member_id != null) body.member_id = Number(body.member_id);
    res.json(updatePhoto(Number(req.params.id), body));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' });
  }
});

photosRouter.delete('/:id', requireAuth, (req, res) => {
  try {
    deletePhoto(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '删除失败' });
  }
});

backupRouter.get('/export', requireAuth, (_req, res) => {
  const data = exportBackup();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="family-tree-backup-${Date.now()}.json"`
  );
  res.send(JSON.stringify(data, null, 2));
});

backupRouter.post('/import', requireAuth, (req, res) => {
  try {
    // 导入前自动落一份当前快照到 data/pre-import-*.json
    const snapshot = exportBackup();
    const snapPath = path.join(
      config.dataDir,
      `pre-import-${Date.now()}.json`
    );
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2), 'utf8');
    const result = importBackup(req.body);
    res.json({ ok: true, preImportSnapshot: path.basename(snapPath), data: result });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '导入失败' });
  }
});
