import { useSyncExternalStore } from 'react'

import type { StudyLogSortOrder } from './studyLogList'

const searchParamsChangedEvent = 'study-log-search-params-changed'

type UseStudyLogSearchParamsResult = Readonly<{
  filterQuery: string
  sortOrder: StudyLogSortOrder
  changeFilterQuery: (query: string) => void
  changeSortOrder: (sortOrder: StudyLogSortOrder) => void
}>

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange)
  window.addEventListener(searchParamsChangedEvent, onStoreChange)

  return () => {
    window.removeEventListener('popstate', onStoreChange)
    window.removeEventListener(searchParamsChangedEvent, onStoreChange)
  }
}

function getSnapshot(): string {
  return window.location.search
}

function getServerSnapshot(): string {
  return ''
}

function parseSortOrder(value: string | null): StudyLogSortOrder {
  switch (value) {
    case 'topic-asc':
    case 'duration-desc':
      return value
    default:
      return 'original'
  }
}

function replaceSearchParams(params: URLSearchParams): void {
  const search = params.toString()
  const url = `${window.location.pathname}${search === '' ? '' : `?${search}`}${window.location.hash}`

  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(searchParamsChangedEvent))
}

export function useStudyLogSearchParams(): UseStudyLogSearchParamsResult {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const params = new URLSearchParams(search)
  const filterQuery = params.get('q') ?? ''
  const sortOrder = parseSortOrder(params.get('sort'))

  function changeFilterQuery(query: string) {
    const nextParams = new URLSearchParams(window.location.search)

    if (query === '') {
      nextParams.delete('q')
    } else {
      nextParams.set('q', query)
    }

    replaceSearchParams(nextParams)
  }

  function changeSortOrder(nextSortOrder: StudyLogSortOrder) {
    const nextParams = new URLSearchParams(window.location.search)

    if (nextSortOrder === 'original') {
      nextParams.delete('sort')
    } else {
      nextParams.set('sort', nextSortOrder)
    }

    replaceSearchParams(nextParams)
  }

  return {
    filterQuery,
    sortOrder,
    changeFilterQuery,
    changeSortOrder,
  }
}
