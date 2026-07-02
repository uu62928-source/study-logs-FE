import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import type { UpdateStudyLog } from '../application/use-cases/updateStudyLog'
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

  async function handleSaveStudyLog(
    studyLog: Parameters<UpdateStudyLog>[0],
  ): Promise<void> {
    await updateStudyLog(studyLog)
    reload()
  }

  return <StudyLogView state={state} onSaveStudyLog={handleSaveStudyLog} />
}
