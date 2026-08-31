/**
 * 单元/接口测试：树构建、鉴权、导入导出
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'family-tree-test-'));
process.env.DATA_DIR = path.join(tmpRoot, 'data');
process.env.UPLOAD_DIR = path.join(tmpRoot, 'uploads');
process.env.DB_PATH = path.join(tmpRoot, 'data', 'family.db');
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'admin123';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const { createApp } = await import('../src/index.js');
const { buildTree, addSpouse, listMembers } = await import('../src/services/members.js');
const { exportBackup, importBackup } = await import('../src/services/content.js');
const { closeDb } = await import('../src/db/connection.js');

const app = createApp();

afterAll(() => {
  closeDb();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('tree', () => {
  it('builds at least 3 generations', () => {
    const roots = buildTree();
    expect(roots.length).toBeGreaterThanOrEqual(1);
    const root = roots[0];
    expect(root.children.length).toBeGreaterThanOrEqual(1);
    const hasGen3 = root.children.some((c) => c.children.length > 0);
    expect(hasGen3).toBe(true);
  });

  it('GET /api/tree returns roots with spouses', async () => {
    const res = await request(app).get('/api/tree');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.roots)).toBe(true);
    expect(res.body.roots[0].spouses?.length).toBeGreaterThanOrEqual(1);
  });
});

describe('members', () => {
  it('lists members', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(8);
  });

  it('get detail with parent', async () => {
    const list = await request(app).get('/api/members');
    const id = list.body.find((m: { name: string }) => m.name === '李伟').id;
    const res = await request(app).get(`/api/members/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.parent.name).toBe('李建国');
  });

  it('rejects create without auth', async () => {
    const res = await request(app).post('/api/members').send({ name: '测试' });
    expect(res.status).toBe(401);
  });
});

describe('auth and write', () => {
  const agent = request.agent(app);

  it('login and create child updates tree', async () => {
    const login = await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(login.status).toBe(200);

    const list = await agent.get('/api/members');
    const parent = list.body.find((m: { name: string }) => m.name === '李伟');
    const before = buildTree();
    const create = await agent.post('/api/members').send({
      name: '李小明',
      gender: 'male',
      parent_id: parent.id,
      birth_order: 1,
    });
    expect(create.status).toBe(201);
    expect(create.body.generation).toBe(parent.generation + 1);

    const after = buildTree();
    const find = (nodes: ReturnType<typeof buildTree>, name: string): boolean => {
      for (const n of nodes) {
        if (n.name === name) return true;
        if (find(n.children, name)) return true;
      }
      return false;
    };
    expect(find(before, '李小明')).toBe(false);
    expect(find(after, '李小明')).toBe(true);
  });
});

describe('backup', () => {
  it('export and import roundtrip', () => {
    const exported = exportBackup();
    expect(exported.version).toBe(1);
    expect(exported.members.length).toBeGreaterThan(0);
    const again = importBackup(exported);
    expect(again.members.length).toBe(exported.members.length);
  });

  it('rejects invalid import', () => {
    expect(() => importBackup({} as never)).toThrow();
  });
});

describe('spouse', () => {
  it('prevents self spouse', () => {
    const list = listMembers();
    const a = list[0].id;
    expect(() => addSpouse(a, a)).toThrow(/自己/);
  });
});
