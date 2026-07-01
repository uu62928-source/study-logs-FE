import { createGetStudyLogSummary } from './application/use-cases/getStudyLogSummary'
import { InMemoryStudyLogRepository } from './infrastructure/InMemoryStudyLogRepository'

const initialStudyLogs = [
  {
    id: 'architecture-boundaries',
    topic: 'アーキテクチャの境界',
    durationMinutes: 45,
  },
  {
    id: 'clean-architecture',
    topic: 'Clean Architecture',
    durationMinutes: 30,
  },
]

export function configureStudyLog() {
  const repository = new InMemoryStudyLogRepository(initialStudyLogs)

  return {
    getStudyLogSummary: createGetStudyLogSummary(repository),
  }
}
