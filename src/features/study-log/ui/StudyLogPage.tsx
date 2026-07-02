import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import type { UpdateStudyLog } from '../application/use-cases/updateStudyLog'
import type { StudyLog } from '../domain/studyLog'
import { StudyLogView } from './StudyLogView'
import { useStudyLogSummary } from './useStudyLogSummary'
import './StudyLogPage.css'

type StudyLogPageProps = Readonly<{
  getStudyLogSummary: GetStudyLogSummary
  updateStudyLog: UpdateStudyLog
}>

export function StudyLogPage({
  getStudyLogSummary,
  updateStudyLog,
}: StudyLogPageProps) {
  const { state, reload } = useStudyLogSummary(getStudyLogSummary)

  async function handleSaveStudyLog(studyLog: StudyLog): Promise<void> {
    await updateStudyLog(studyLog)
    reload()
  }

  if (state.status === 'success') {
    return <StudyLogView {...state} onSaveStudyLog={handleSaveStudyLog} />
  }

  return <StudyLogView {...state} />
}
