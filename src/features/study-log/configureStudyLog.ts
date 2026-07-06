import { createAddStudyLog } from './application/use-cases/addStudyLog'
import { createDeleteStudyLog } from './application/use-cases/deleteStudyLog'
import { createGetStudyLogSummary } from './application/use-cases/getStudyLogSummary'
import { createUpdateStudyLog } from './application/use-cases/updateStudyLog'
import { HttpStudyLogRepository } from './infrastructure/HttpStudyLogRepository'

type ConfigureStudyLogOptions = Readonly<{
  apiBaseUrl: string
  fetcher?: typeof fetch
}>

export function configureStudyLog({
  apiBaseUrl,
  fetcher,
}: ConfigureStudyLogOptions) {
  const repository =
    fetcher === undefined
      ? new HttpStudyLogRepository(apiBaseUrl)
      : new HttpStudyLogRepository(apiBaseUrl, fetcher)

  return {
    addStudyLog: createAddStudyLog(repository),
    deleteStudyLog: createDeleteStudyLog(repository),
    getStudyLogSummary: createGetStudyLogSummary(repository),
    updateStudyLog: createUpdateStudyLog(repository),
  }
}
