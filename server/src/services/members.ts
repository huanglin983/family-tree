/**
 * 成员与世系树服务
 */
import { getDb } from '../db/connection.js';
import type { MemberRow, SpouseBrief, TreeNode } from '../utils/types.js';
import { nowIso, spousePair } from '../utils/types.js';

export function listMembers(familyId = 1): MemberRow[] {
  return getDb()
    .prepare('SELECT * FROM members WHERE family_id = ? ORDER BY generation, birth_order, id')
    .all(familyId) as MemberRow[];
}

export function getMember(id: number): MemberRow | undefined {
  return getDb().prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow | undefined;
}

export function getSpouses(memberId: number): SpouseBrief[] {
  const rows = getDb()
    .prepare(
      `
      SELECT m.id, m.name, m.gender, m.photo_url
      FROM relationships r
      JOIN members m ON m.id = CASE WHEN r.member_a_id = ? THEN r.member_b_id ELSE r.member_a_id END
      WHERE r.relation_type = 'spouse' AND (r.member_a_id = ? OR r.member_b_id = ?)
    `
    )
    .all(memberId, memberId, memberId) as SpouseBrief[];
  return rows;
}

export function getChildren(parentId: number): MemberRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM members WHERE parent_id = ? ORDER BY birth_order, id'
    )
    .all(parentId) as MemberRow[];
}

export function getSiblings(member: MemberRow): MemberRow[] {
  if (member.parent_id == null) return [];
  return getDb()
    .prepare(
      'SELECT * FROM members WHERE parent_id = ? AND id != ? ORDER BY birth_order, id'
    )
    .all(member.parent_id, member.id) as MemberRow[];
}

export function getMemberDetail(id: number) {
  const member = getMember(id);
  if (!member) return null;
  const parent = member.parent_id ? getMember(member.parent_id) : null;
  const spouses = getSpouses(id);
  const children = getChildren(id);
  const siblings = getSiblings(member);
  // 另一位父母：取父的配偶中非本人（简化：父系树下显示父之配偶）
  let mother: SpouseBrief | null = null;
  if (parent) {
    const parentSpouses = getSpouses(parent.id);
    mother = parentSpouses[0] ?? null;
  }
  return { member, parent, mother, spouses, children, siblings };
}

function toTreeNode(m: MemberRow, all: MemberRow[], spouseMap: Map<number, SpouseBrief[]>): TreeNode {
  const children = all
    .filter((c) => c.parent_id === m.id)
    .sort((a, b) => a.birth_order - b.birth_order || a.id - b.id)
    .map((c) => toTreeNode(c, all, spouseMap));
  return {
    id: m.id,
    name: m.name,
    gender: m.gender,
    birth_date: m.birth_date,
    death_date: m.death_date,
    photo_url: m.photo_url,
    generation: m.generation,
    birth_order: m.birth_order,
    is_deceased: m.is_deceased,
    spouses: spouseMap.get(m.id) || [],
    children,
  };
}

export function buildTree(familyId = 1): TreeNode[] {
  const all = listMembers(familyId);
  const spouseMap = new Map<number, SpouseBrief[]>();
  for (const m of all) {
    spouseMap.set(m.id, getSpouses(m.id));
  }
  // 根：无 parent_id，且其 id 作为别人的 parent，或 generation=1 血缘主轴
  // 配偶无 parent 且无子女挂在其下时不作为树根展示（避免王秀英单独成树）
  const childParentIds = new Set(all.filter((m) => m.parent_id != null).map((m) => m.parent_id!));
  const roots = all.filter((m) => m.parent_id == null && childParentIds.has(m.id));
  // 若没有「有子女的无父节点」，回退到所有无父节点
  const rootList = roots.length > 0 ? roots : all.filter((m) => m.parent_id == null);
  return rootList.map((r) => toTreeNode(r, all, spouseMap));
}

export interface MemberInput {
  name: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  parent_id?: number | null;
  birth_order?: number;
  generation?: number;
  photo_url?: string;
  biography?: string;
  notes?: string;
  is_deceased?: number;
  family_id?: number;
}

export function createMember(input: MemberInput): MemberRow {
  const db = getDb();
  let generation = input.generation ?? 1;
  if (input.parent_id != null && input.generation == null) {
    const parent = getMember(input.parent_id);
    if (!parent) throw new Error('父成员不存在');
    generation = parent.generation + 1;
  }
  const info = db
    .prepare(
      `
    INSERT INTO members (
      family_id, name, gender, birth_date, death_date, parent_id,
      birth_order, generation, photo_url, biography, notes, is_deceased, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      input.family_id ?? 1,
      input.name,
      input.gender || 'unknown',
      input.birth_date || '',
      input.death_date || '',
      input.parent_id ?? null,
      input.birth_order ?? 0,
      generation,
      input.photo_url || '',
      input.biography || '',
      input.notes || '',
      input.is_deceased ?? 0,
      nowIso()
    );
  return getMember(Number(info.lastInsertRowid))!;
}

export function updateMember(id: number, input: Partial<MemberInput>): MemberRow {
  const existing = getMember(id);
  if (!existing) throw new Error('成员不存在');
  if (input.parent_id != null) {
    const parent = getMember(input.parent_id);
    if (!parent) throw new Error('父成员不存在');
    if (input.parent_id === id) throw new Error('不能将自己设为父母');
  }
  const next = {
    name: input.name ?? existing.name,
    gender: input.gender ?? existing.gender,
    birth_date: input.birth_date ?? existing.birth_date,
    death_date: input.death_date ?? existing.death_date,
    parent_id: input.parent_id !== undefined ? input.parent_id : existing.parent_id,
    birth_order: input.birth_order ?? existing.birth_order,
    generation: input.generation ?? existing.generation,
    photo_url: input.photo_url ?? existing.photo_url,
    biography: input.biography ?? existing.biography,
    notes: input.notes ?? existing.notes,
    is_deceased: input.is_deceased ?? existing.is_deceased,
  };
  if (input.parent_id != null && input.generation == null) {
    const parent = getMember(input.parent_id)!;
    next.generation = parent.generation + 1;
  }
  getDb()
    .prepare(
      `
    UPDATE members SET
      name=?, gender=?, birth_date=?, death_date=?, parent_id=?,
      birth_order=?, generation=?, photo_url=?, biography=?, notes=?,
      is_deceased=?, updated_at=?
    WHERE id=?
  `
    )
    .run(
      next.name,
      next.gender,
      next.birth_date,
      next.death_date,
      next.parent_id,
      next.birth_order,
      next.generation,
      next.photo_url,
      next.biography,
      next.notes,
      next.is_deceased,
      nowIso(),
      id
    );
  return getMember(id)!;
}

export function deleteMember(id: number): void {
  const children = getChildren(id);
  if (children.length > 0) {
    throw new Error('请先处理子女关系后再删除');
  }
  const info = getDb().prepare('DELETE FROM members WHERE id = ?').run(id);
  if (info.changes === 0) throw new Error('成员不存在');
}

export function listSpouses(familyId = 1) {
  return getDb()
    .prepare(
      `SELECT * FROM relationships WHERE family_id = ? AND relation_type = 'spouse' ORDER BY id`
    )
    .all(familyId);
}

export function addSpouse(memberA: number, memberB: number, note = ''): void {
  if (memberA === memberB) throw new Error('不能与自己结成配偶');
  if (!getMember(memberA) || !getMember(memberB)) throw new Error('成员不存在');
  const [a, b] = spousePair(memberA, memberB);
  try {
    getDb()
      .prepare(
        `INSERT INTO relationships (family_id, member_a_id, member_b_id, relation_type, note)
         VALUES (1, ?, ?, 'spouse', ?)`
      )
      .run(a, b, note);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) throw new Error('配偶关系已存在');
    throw e;
  }
}

export function removeRelationship(id: number): void {
  const info = getDb().prepare('DELETE FROM relationships WHERE id = ?').run(id);
  if (info.changes === 0) throw new Error('关系不存在');
}
