import type { StudyLogListItemViewModel } from './studyLogViewModel'

export type StudyLogSortOrder = 'original' | 'topic-asc' | 'duration-desc'

export function sortStudyLogs(
  studyLogs: readonly StudyLogListItemViewModel[],
  sortOrder: StudyLogSortOrder,
): readonly StudyLogListItemViewModel[] {
  const sortedStudyLogs = [...studyLogs]

  switch (sortOrder) {
    case 'original':
      return sortedStudyLogs
    case 'topic-asc':
      return sortedStudyLogs.sort((a, b) =>
        a.topic.localeCompare(b.topic, 'ja'),
      )
    case 'duration-desc':
      return sortedStudyLogs.sort(
        (a, b) => b.durationMinutes - a.durationMinutes,
      )
  }
}
