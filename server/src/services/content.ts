/**
 * 家族 / 事件 / 照片 / 备份服务
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { nowIso } from '../utils/types.js';
import { listMembers } from './members.js';

export function getFamily(id = 1) {
  return getDb().prepare('SELECT * FROM families WHERE id = ?').get(id);
}

export function updateFamily(input: {
  name?: string;
  description?: string;
  cover_photo?: string;
}) {
  const cur = getFamily(1) as Record<string, string>;
  if (!cur) throw new Error('家族不存在');
  getDb()
    .prepare(
      `UPDATE families SET name=?, description=?, cover_photo=?, updated_at=? WHERE id=1`
    )
    .run(
      input.name ?? cur.name,
      input.description ?? cur.description,
      input.cover_photo ?? cur.cover_photo,
      nowIso()
    );
  return getFamily(1);
}

export function getFamilySummary() {
  const family = getFamily(1);
  const memberCount = (
    getDb().prepare('SELECT COUNT(*) AS c FROM members WHERE family_id = 1').get() as {
      c: number;
    }
  ).c;
  const eventCount = (
    getDb().prepare('SELECT COUNT(*) AS c FROM events WHERE family_id = 1').get() as {
      c: number;
    }
  ).c;
  const photoCount = (
    getDb().prepare('SELECT COUNT(*) AS c FROM photos WHERE family_id = 1').get() as {
      c: number;
    }
  ).c;
  return { family, memberCount, eventCount, photoCount };
}

export function parseImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && !!u);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === 'string' && !!u);
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function normalizeEvent(row: Record<string, unknown> | undefined) {
  if (!row) return undefined;
  return {
    ...row,
    image_urls: parseImageUrls(row.image_urls),
    related_member_ids:
      typeof row.related_member_ids === 'string'
        ? (() => {
            try {
              return JSON.parse(row.related_member_ids as string);
            } catch {
              return [];
            }
          })()
        : row.related_member_ids || [],
  };
}

export function listEvents() {
  const rows = getDb()
    .prepare(
      `SELECT * FROM events WHERE family_id = 1 ORDER BY event_date DESC, id DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((r) => normalizeEvent(r)!);
}

export function getEvent(id: number) {
  const row = getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return normalizeEvent(row);
}

export function createEvent(input: {
  title: string;
  event_type?: string;
  event_date?: string;
  description?: string;
  related_member_ids?: number[];
  image_urls?: string[];
}) {
  const ids = JSON.stringify(input.related_member_ids || []);
  const images = JSON.stringify(parseImageUrls(input.image_urls || []));
  const info = getDb()
    .prepare(
      `INSERT INTO events (family_id, title, event_type, event_date, description, related_member_ids, image_urls, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.event_type || 'other',
      input.event_date || '',
      input.description || '',
      ids,
      images,
      nowIso()
    );
  return getEvent(Number(info.lastInsertRowid));
}

export function updateEvent(
  id: number,
  input: {
    title?: string;
    event_type?: string;
    event_date?: string;
    description?: string;
    related_member_ids?: number[];
    image_urls?: string[];
  }
) {
  const cur = getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!cur) throw new Error('事件不存在');
  const ids =
    input.related_member_ids !== undefined
      ? JSON.stringify(input.related_member_ids)
      : (cur.related_member_ids as string);
  const images =
    input.image_urls !== undefined
      ? JSON.stringify(parseImageUrls(input.image_urls))
      : ((cur.image_urls as string) || '[]');
  getDb()
    .prepare(
      `UPDATE events SET title=?, event_type=?, event_date=?, description=?, related_member_ids=?, image_urls=?, updated_at=?
       WHERE id=?`
    )
    .run(
      input.title ?? cur.title,
      input.event_type ?? cur.event_type,
      input.event_date ?? cur.event_date,
      input.description ?? cur.description,
      ids,
      images,
      nowIso(),
      id
    );
  return getEvent(id);
}

export function deleteEvent(id: number) {
  const info = getDb().prepare('DELETE FROM events WHERE id = ?').run(id);
  if (info.changes === 0) throw new Error('事件不存在');
}

export function listPhotos() {
  return getDb()
    .prepare(`SELECT * FROM photos WHERE family_id = 1 ORDER BY taken_at DESC, id DESC`)
    .all();
}

export function getPhoto(id: number) {
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

export function createPhoto(input: {
  title?: string;
  url: string;
  description?: string;
  taken_at?: string;
  member_id?: number | null;
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO photos (family_id, member_id, title, url, description, taken_at)
       VALUES (1, ?, ?, ?, ?, ?)`
    )
    .run(
      input.member_id ?? null,
      input.title || '',
      input.url,
      input.description || '',
      input.taken_at || ''
    );
  return getPhoto(Number(info.lastInsertRowid));
}

export function updatePhoto(
  id: number,
  input: {
    title?: string;
    url?: string;
    description?: string;
    taken_at?: string;
    member_id?: number | null;
  }
) {
  const cur = getPhoto(id) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('照片不存在');
  getDb()
    .prepare(
      `UPDATE photos SET member_id=?, title=?, url=?, description=?, taken_at=? WHERE id=?`
    )
    .run(
      input.member_id !== undefined ? input.member_id : cur.member_id,
      input.title ?? cur.title,
      input.url ?? cur.url,
      input.description ?? cur.description,
      input.taken_at ?? cur.taken_at,
      id
    );
  return getPhoto(id);
}

export function deletePhoto(id: number) {
  const cur = getPhoto(id) as { url?: string } | undefined;
  if (!cur) throw new Error('照片不存在');
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
  // 仅删除 uploads 目录下文件
  if (cur.url?.startsWith('/uploads/')) {
    const file = path.join(config.uploadDir, path.basename(cur.url));
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
    }
  }
}

export const BACKUP_VERSION = 1;

export function exportBackup() {
  const db = getDb();
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    family: getFamily(1),
    members: listMembers(1),
    relationships: db.prepare('SELECT * FROM relationships WHERE family_id = 1').all(),
    events: listEvents(),
    photos: listPhotos(),
  };
}

export function importBackup(payload: {
  version?: number;
  family?: Record<string, unknown>;
  members?: Record<string, unknown>[];
  relationships?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  photos?: Record<string, unknown>[];
}) {
  if (!payload || typeof payload !== 'object') throw new Error('无效备份文件');
  if (payload.version != null && payload.version !== BACKUP_VERSION) {
    throw new Error(`不支持的备份版本: ${payload.version}`);
  }
  if (!payload.family || !Array.isArray(payload.members)) {
    throw new Error('备份缺少 family 或 members');
  }

  const db = getDb();
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM photos;
      DELETE FROM events;
      DELETE FROM relationships;
      DELETE FROM members;
      DELETE FROM families;
    `);

    const f = payload.family!;
    db.prepare(
      `INSERT INTO families (id, name, description, cover_photo, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      f.id ?? 1,
      f.name || '未命名家族',
      f.description || '',
      f.cover_photo || '',
      f.updated_at || nowIso()
    );

    const insMember = db.prepare(`
      INSERT INTO members (
        id, family_id, name, gender, birth_date, death_date, parent_id,
        birth_order, generation, photo_url, biography, notes, is_deceased, created_at, updated_at
      ) VALUES (
        @id, @family_id, @name, @gender, @birth_date, @death_date, @parent_id,
        @birth_order, @generation, @photo_url, @biography, @notes, @is_deceased, @created_at, @updated_at
      )
    `);

    for (const m of payload.members!) {
      insMember.run({
        id: m.id,
        family_id: m.family_id ?? 1,
        name: m.name,
        gender: m.gender || 'unknown',
        birth_date: m.birth_date || '',
        death_date: m.death_date || '',
        parent_id: m.parent_id ?? null,
        birth_order: m.birth_order ?? 0,
        generation: m.generation ?? 1,
        photo_url: m.photo_url || '',
        biography: m.biography || '',
        notes: m.notes || '',
        is_deceased: m.is_deceased ?? 0,
        created_at: m.created_at || nowIso(),
        updated_at: m.updated_at || nowIso(),
      });
    }

    const insRel = db.prepare(`
      INSERT INTO relationships (id, family_id, member_a_id, member_b_id, relation_type, note, created_at)
      VALUES (@id, @family_id, @member_a_id, @member_b_id, @relation_type, @note, @created_at)
    `);
    for (const r of payload.relationships || []) {
      insRel.run({
        id: r.id,
        family_id: r.family_id ?? 1,
        member_a_id: r.member_a_id,
        member_b_id: r.member_b_id,
        relation_type: r.relation_type || 'spouse',
        note: r.note || '',
        created_at: r.created_at || nowIso(),
      });
    }

    const insEvent = db.prepare(`
      INSERT INTO events (id, family_id, title, event_type, event_date, description, related_member_ids, image_urls, created_at, updated_at)
      VALUES (@id, @family_id, @title, @event_type, @event_date, @description, @related_member_ids, @image_urls, @created_at, @updated_at)
    `);
    for (const e of payload.events || []) {
      insEvent.run({
        id: e.id,
        family_id: e.family_id ?? 1,
        title: e.title,
        event_type: e.event_type || 'other',
        event_date: e.event_date || '',
        description: e.description || '',
        related_member_ids:
          typeof e.related_member_ids === 'string'
            ? e.related_member_ids
            : JSON.stringify(e.related_member_ids || []),
        image_urls:
          typeof e.image_urls === 'string'
            ? e.image_urls
            : JSON.stringify(e.image_urls || []),
        created_at: e.created_at || nowIso(),
        updated_at: e.updated_at || nowIso(),
      });
    }

    const insPhoto = db.prepare(`
      INSERT INTO photos (id, family_id, member_id, title, url, description, taken_at, created_at)
      VALUES (@id, @family_id, @member_id, @title, @url, @description, @taken_at, @created_at)
    `);
    for (const p of payload.photos || []) {
      insPhoto.run({
        id: p.id,
        family_id: p.family_id ?? 1,
        member_id: p.member_id ?? null,
        title: p.title || '',
        url: p.url,
        description: p.description || '',
        taken_at: p.taken_at || '',
        created_at: p.created_at || nowIso(),
      });
    }
  });

  tx();
  return exportBackup();
}
