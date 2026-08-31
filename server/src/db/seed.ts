/**
 * 种子数据：黄氏族谱 + 管理员
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { getDb, closeDb } from './connection.js';
import { migrate } from './migrate.js';

export function seed(force = false): void {
  migrate();
  const db = getDb();

  const familyCount = db.prepare('SELECT COUNT(*) AS c FROM families').get() as { c: number };
  if (familyCount.c > 0 && !force) {
    console.log('Seed skipped: data already exists');
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM photos;
      DELETE FROM events;
      DELETE FROM relationships;
      DELETE FROM members;
      DELETE FROM admins;
      DELETE FROM families;
    `);
  }

  const hash = bcrypt.hashSync(config.adminPass, 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO families (id, name, description) VALUES (1, ?, ?)`
    ).run('黄氏族谱', '');

    db.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).run(
      config.adminUser,
      hash
    );

    // 一代：始祖
    const ins = db.prepare(`
      INSERT INTO members (family_id, name, gender, birth_date, death_date, parent_id, birth_order, generation, biography, is_deceased)
      VALUES (1, @name, @gender, @birth_date, @death_date, @parent_id, @birth_order, @generation, @biography, @is_deceased)
    `);

    const root = Number(
      ins.run({
        name: '李德福',
        gender: 'male',
        birth_date: '1920',
        death_date: '1998',
        parent_id: null,
        birth_order: 1,
        generation: 1,
        biography: '本支始祖，迁居本地。',
        is_deceased: 1,
      }).lastInsertRowid
    );

    const rootSpouse = Number(
      ins.run({
        name: '王秀英',
        gender: 'female',
        birth_date: '1925',
        death_date: '2005',
        parent_id: null,
        birth_order: 1,
        generation: 1,
        biography: '德福公配偶。',
        is_deceased: 1,
      }).lastInsertRowid
    );

    // 二代
    const son1 = Number(
      ins.run({
        name: '李建国',
        gender: 'male',
        birth_date: '1948',
        death_date: '',
        parent_id: root,
        birth_order: 1,
        generation: 2,
        biography: '长子。',
        is_deceased: 0,
      }).lastInsertRowid
    );
    const son1Spouse = Number(
      ins.run({
        name: '张桂兰',
        gender: 'female',
        birth_date: '1950',
        death_date: '',
        parent_id: null,
        birth_order: 1,
        generation: 2,
        biography: '建国配偶。',
        is_deceased: 0,
      }).lastInsertRowid
    );
    const daughter = Number(
      ins.run({
        name: '李建华',
        gender: 'female',
        birth_date: '1952',
        death_date: '',
        parent_id: root,
        birth_order: 2,
        generation: 2,
        biography: '次女。',
        is_deceased: 0,
      }).lastInsertRowid
    );
    const son2 = Number(
      ins.run({
        name: '李建军',
        gender: 'male',
        birth_date: '1955',
        death_date: '',
        parent_id: root,
        birth_order: 3,
        generation: 2,
        biography: '三子。',
        is_deceased: 0,
      }).lastInsertRowid
    );

    // 三代
    const g3a = Number(
      ins.run({
        name: '李伟',
        gender: 'male',
        birth_date: '1975-03',
        death_date: '',
        parent_id: son1,
        birth_order: 1,
        generation: 3,
        biography: '建国长子。',
        is_deceased: 0,
      }).lastInsertRowid
    );
    const g3b = Number(
      ins.run({
        name: '李娜',
        gender: 'female',
        birth_date: '1978-08',
        death_date: '',
        parent_id: son1,
        birth_order: 2,
        generation: 3,
        biography: '建国次女。',
        is_deceased: 0,
      }).lastInsertRowid
    );
    const g3c = Number(
      ins.run({
        name: '李强',
        gender: 'male',
        birth_date: '1980',
        death_date: '',
        parent_id: son2,
        birth_order: 1,
        generation: 3,
        biography: '建军之子。',
        is_deceased: 0,
      }).lastInsertRowid
    );

    const spouseRel = db.prepare(`
      INSERT INTO relationships (family_id, member_a_id, member_b_id, relation_type, note)
      VALUES (1, ?, ?, 'spouse', ?)
    `);
    const pair = (a: number, b: number, note: string) => {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      spouseRel.run(lo, hi, note);
    };
    pair(root, rootSpouse, '德福与秀英');
    pair(son1, son1Spouse, '建国与桂兰');

    db.prepare(`
      INSERT INTO events (family_id, title, event_type, event_date, description, related_member_ids)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      '德福公迁居本地',
      'migration',
      '1945',
      '抗战结束后举家迁入现居地。',
      JSON.stringify([root, rootSpouse])
    );
    db.prepare(`
      INSERT INTO events (family_id, title, event_type, event_date, description, related_member_ids)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      '建国与桂兰成婚',
      'marriage',
      '1972',
      '二代长房成家。',
      JSON.stringify([son1, son1Spouse])
    );
    db.prepare(`
      INSERT INTO events (family_id, title, event_type, event_date, description, related_member_ids)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      '清明祭祖',
      'ancestor_worship',
      '2024-04-04',
      '族人齐聚扫墓。',
      JSON.stringify([g3a, g3b, g3c])
    );

    db.prepare(`
      INSERT INTO photos (family_id, member_id, title, url, description, taken_at)
      VALUES (1, NULL, ?, ?, ?, ?)
    `).run('家族合影（示例占位）', '/uploads/placeholder-family.svg', '演示用占位图', '2020');
  });

  tx();
  console.log('Seed completed. Admin:', config.adminUser);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
const self = path.resolve(fileURLToPath(import.meta.url));
if (entry === self) {
  seed(process.argv.includes('--force'));
  closeDb();
}
