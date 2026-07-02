import { createGetStudyLogSummary } from './application/use-cases/getStudyLogSummary'
import { createStudyLog } from './domain/studyLog'
import { InMemoryStudyLogRepository } from './infrastructure/InMemoryStudyLogRepository'

const initialStudyLogs = [
  createStudyLog({
    id: 'architecture-boundaries',
    topic: 'アーキテクチャの境界',
    durationMinutes: 45,
  }),
  createStudyLog({
    id: 'clean-architecture',
    topic: 'Clean Architecture',
    durationMinutes: 30,
  }),
]

export function configureStudyLog() {
  const repository = new InMemoryStudyLogRepository(initialStudyLogs)

  return {
    getStudyLogSummary: createGetStudyLogSummary(repository),
  }
}
