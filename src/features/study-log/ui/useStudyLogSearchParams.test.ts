import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useStudyLogSearchParams } from './useStudyLogSearchParams'

describe('useStudyLogSearchParams', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('URLから検索条件と並び順を読み取る', () => {
    window.history.replaceState(null, '', '/?q=TypeScript&sort=duration-desc')

    const { result } = renderHook(() => useStudyLogSearchParams())

    expect(result.current.filterQuery).toBe('TypeScript')
    expect(result.current.sortOrder).toBe('duration-desc')
  })

  it('検索条件をURLへ反映して既定値なら削除する', () => {
    const { result } = renderHook(() => useStudyLogSearchParams())

    act(() => {
      result.current.changeFilterQuery('React')
    })

    expect(window.location.search).toBe('?q=React')
    expect(result.current.filterQuery).toBe('React')

    act(() => {
      result.current.changeFilterQuery('')
    })

    expect(window.location.search).toBe('')
    expect(result.current.filterQuery).toBe('')
  })

  it('並び順をURLへ反映して登録順なら削除する', () => {
    const { result } = renderHook(() => useStudyLogSearchParams())

    act(() => {
      result.current.changeSortOrder('topic-asc')
    })

    expect(window.location.search).toBe('?sort=topic-asc')
    expect(result.current.sortOrder).toBe('topic-asc')

    act(() => {
      result.current.changeSortOrder('original')
    })

    expect(window.location.search).toBe('')
    expect(result.current.sortOrder).toBe('original')
  })

  it('不正な並び順は登録順として扱う', () => {
    window.history.replaceState(null, '', '/?sort=unknown')

    const { result } = renderHook(() => useStudyLogSearchParams())

    expect(result.current.sortOrder).toBe('original')
  })

  it('ブラウザ履歴によるURL変更を反映する', () => {
    const { result } = renderHook(() => useStudyLogSearchParams())

    act(() => {
      window.history.pushState(null, '', '/?q=React')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.filterQuery).toBe('React')
  })
})
