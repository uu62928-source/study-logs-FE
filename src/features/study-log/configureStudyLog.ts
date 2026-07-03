import { createAddStudyLog } from './application/use-cases/addStudyLog'
import { createDeleteStudyLog } from './application/use-cases/deleteStudyLog'
import { createGetStudyLogSummary } from './application/use-cases/getStudyLogSummary'
import { createUpdateStudyLog } from './application/use-cases/updateStudyLog'
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
    addStudyLog: createAddStudyLog(repository),
    deleteStudyLog: createDeleteStudyLog(repository),
    getStudyLogSummary: createGetStudyLogSummary(repository),
    updateStudyLog: createUpdateStudyLog(repository),
  }
}
