import type { AddStudyLog } from '../application/use-cases/addStudyLog'
import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import type { UpdateStudyLog } from '../application/use-cases/updateStudyLog'
import type { StudyLog } from '../domain/studyLog'
import { StudyLogView } from './StudyLogView'
import { useStudyLogSummary } from './useStudyLogSummary'
import './StudyLogPage.css'

type StudyLogPageProps = Readonly<{
  addStudyLog: AddStudyLog
  getStudyLogSummary: GetStudyLogSummary
  updateStudyLog: UpdateStudyLog
}>

export function StudyLogPage({
  addStudyLog,
  getStudyLogSummary,
  updateStudyLog,
}: StudyLogPageProps) {
  const { state, reload } = useStudyLogSummary(getStudyLogSummary)

  async function handleAddStudyLog(studyLog: StudyLog): Promise<void> {
    await addStudyLog(studyLog)
    reload()
  }

  async function handleUpdateStudyLog(studyLog: StudyLog): Promise<void> {
    await updateStudyLog(studyLog)
    reload()
  }

  return (
    <StudyLogView
      {...state}
      onAddStudyLog={handleAddStudyLog}
      onUpdateStudyLog={handleUpdateStudyLog}
    />
  )
}
