/**
 * 类型与公共工具
 */
export type Gender = 'male' | 'female' | 'unknown';
export type EventType = 'marriage' | 'migration' | 'ancestor_worship' | 'birth' | 'other';

export interface MemberRow {
  id: number;
  family_id: number;
  name: string;
  gender: Gender;
  birth_date: string;
  death_date: string;
  parent_id: number | null;
  birth_order: number;
  generation: number;
  photo_url: string;
  biography: string;
  notes: string;
  is_deceased: number;
  created_at: string;
  updated_at: string;
}

export interface SpouseBrief {
  id: number;
  name: string;
  gender: Gender;
  photo_url: string;
}

export interface TreeNode {
  id: number;
  name: string;
  gender: Gender;
  birth_date: string;
  death_date: string;
  photo_url: string;
  generation: number;
  birth_order: number;
  is_deceased: number;
  spouses: SpouseBrief[];
  children: TreeNode[];
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function spousePair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}
