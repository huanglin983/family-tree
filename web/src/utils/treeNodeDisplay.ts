/**
 * 世系图节点展示工具
 * 分层：工具层；用途：性别/生年/在世文案、成员判定、代数标注
 * 创建：2026-08
 */

export function genderLabel(g: unknown): string {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '未知'
}

/** 生年：取 YYYY / YYYY-MM / YYYY-MM-DD 的年份部分 */
export function birthYear(date: unknown): string {
  if (typeof date !== 'string' || !date.trim()) return ''
  const m = date.trim().match(/^(\d{4})/)
  return m ? m[1] : date.trim()
}

export function livingLabel(d: {
  is_deceased?: unknown
  death_date?: unknown
}): string {
  const deceased = Number(d.is_deceased) === 1 || Boolean(d.death_date)
  return deceased ? '已故' : '在世'
}

/** 真实成员节点才展示性别/生年/在世（虚拟根、暂无数据不展示） */
export function isMemberNode(d: { id?: unknown; gender?: unknown }): boolean {
  const id = Number(d.id)
  return Number.isFinite(id) && id > 0 && typeof d.gender === 'string'
}

/** 代数文案：1 → 「1世」；非法值返回空 */
export function generationLabel(generation: unknown): string {
  const n = Number(generation)
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return ''
  return `${n}世`
}

/**
 * 从 vue3-tree-org 树数据收集已出现的代数（升序）
 * 跳过虚拟根 / 非法节点
 */
export function collectGenerations(node: Record<string, unknown> | null | undefined): number[] {
  const out = new Set<number>()

  function walk(n: unknown): void {
    if (!n || typeof n !== 'object') return
    const row = n as Record<string, unknown>
    if (isMemberNode(row)) {
      const g = Number(row.generation)
      if (Number.isFinite(g) && g >= 1 && Number.isInteger(g)) out.add(g)
    }
    const children = row.children
    if (Array.isArray(children)) children.forEach(walk)
  }

  walk(node)
  return [...out].sort((a, b) => a - b)
}
