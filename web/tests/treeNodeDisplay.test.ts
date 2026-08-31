/**
 * 世系图节点展示工具单测
 */
import { describe, expect, it } from 'vitest'
import {
  birthYear,
  collectGenerations,
  genderLabel,
  generationLabel,
  isMemberNode,
  livingLabel,
} from '../src/utils/treeNodeDisplay'

describe('treeNodeDisplay', () => {
  it('genderLabel 映射男/女/未知', () => {
    expect(genderLabel('male')).toBe('男')
    expect(genderLabel('female')).toBe('女')
    expect(genderLabel('unknown')).toBe('未知')
    expect(genderLabel(undefined)).toBe('未知')
    expect(genderLabel(3)).toBe('未知')
  })

  it('birthYear 解析 YYYY / YYYY-MM / YYYY-MM-DD / 空值', () => {
    expect(birthYear('1920')).toBe('1920')
    expect(birthYear('1975-03')).toBe('1975')
    expect(birthYear('1980-08-15')).toBe('1980')
    expect(birthYear('')).toBe('')
    expect(birthYear(null)).toBe('')
    expect(birthYear('  1948  ')).toBe('1948')
  })

  it('livingLabel 在世/已故（含卒年兜底）', () => {
    expect(livingLabel({ is_deceased: 0 })).toBe('在世')
    expect(livingLabel({ is_deceased: 1 })).toBe('已故')
    expect(livingLabel({ is_deceased: 0, death_date: '2000' })).toBe('已故')
    expect(livingLabel({})).toBe('在世')
  })

  it('isMemberNode 排除虚拟根与非法节点', () => {
    expect(isMemberNode({ id: 1, gender: 'male' })).toBe(true)
    expect(isMemberNode({ id: -1, gender: 'male' })).toBe(false)
    expect(isMemberNode({ id: 0, label: '暂无数据' })).toBe(false)
    expect(isMemberNode({ id: 2 })).toBe(false)
  })

  it('generationLabel 输出 N世 / 非法为空', () => {
    expect(generationLabel(1)).toBe('1世')
    expect(generationLabel(12)).toBe('12世')
    expect(generationLabel(0)).toBe('')
    expect(generationLabel(-1)).toBe('')
    expect(generationLabel(1.5)).toBe('')
    expect(generationLabel(undefined)).toBe('')
    expect(generationLabel('3')).toBe('3世')
  })

  it('collectGenerations 升序去重并跳过虚拟根', () => {
    expect(collectGenerations(null)).toEqual([])
    expect(
      collectGenerations({
        id: -1,
        label: '家族',
        children: [
          {
            id: 1,
            gender: 'male',
            generation: 1,
            children: [
              { id: 2, gender: 'male', generation: 2, children: [] },
              { id: 3, gender: 'female', generation: 2, children: [] },
            ],
          },
          { id: 4, gender: 'male', generation: 3, children: [] },
        ],
      })
    ).toEqual([1, 2, 3])
  })
})
