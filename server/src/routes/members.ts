/**
 * 家族 / 成员 / 树 / 关系路由
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  addSpouse,
  buildTree,
  createMember,
  deleteMember,
  getMemberDetail,
  listMembers,
  listSpouses,
  removeRelationship,
  updateMember,
} from '../services/members.js';
import { getFamilySummary, updateFamily } from '../services/content.js';

export const familyRouter = Router();
export const membersRouter = Router();
export const treeRouter = Router();
export const relationshipsRouter = Router();

familyRouter.get('/', (_req, res) => {
  res.json(getFamilySummary());
});

familyRouter.put('/', requireAuth, (req, res) => {
  try {
    res.json(updateFamily(req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' });
  }
});

membersRouter.get('/', (_req, res) => {
  res.json(listMembers());
});

membersRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '无效 ID' });
    return;
  }
  const detail = getMemberDetail(id);
  if (!detail) {
    res.status(404).json({ error: '成员不存在' });
    return;
  }
  res.json(detail);
});

membersRouter.post('/', requireAuth, (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || typeof body.name !== 'string') {
      res.status(400).json({ error: '姓名必填' });
      return;
    }
    res.status(201).json(createMember(body));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '创建失败' });
  }
});

membersRouter.put('/:id', requireAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    res.json(updateMember(id, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' });
  }
});

membersRouter.delete('/:id', requireAuth, (req, res) => {
  try {
    deleteMember(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '删除失败' });
  }
});

treeRouter.get('/', (_req, res) => {
  res.json({ roots: buildTree() });
});

relationshipsRouter.get('/', (_req, res) => {
  res.json(listSpouses());
});

relationshipsRouter.post('/', requireAuth, (req, res) => {
  try {
    const { member_a_id, member_b_id, note } = req.body || {};
    if (!member_a_id || !member_b_id) {
      res.status(400).json({ error: '需要 member_a_id 与 member_b_id' });
      return;
    }
    addSpouse(Number(member_a_id), Number(member_b_id), note || '');
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '创建失败' });
  }
});

relationshipsRouter.delete('/:id', requireAuth, (req, res) => {
  try {
    removeRelationship(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '删除失败' });
  }
});
