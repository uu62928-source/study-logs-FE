import type { AddStudyLog } from '../application/use-cases/addStudyLog'
import type { DeleteStudyLog } from '../application/use-cases/deleteStudyLog'
import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import type { UpdateStudyLog } from '../application/use-cases/updateStudyLog'
import type { StudyLog } from '../domain/studyLog'
import { StudyLogView } from './StudyLogView'
import { useStudyLogSummary } from './useStudyLogSummary'
import './StudyLogPage.css'

type StudyLogPageProps = Readonly<{
  addStudyLog: AddStudyLog
  deleteStudyLog: DeleteStudyLog
  getStudyLogSummary: GetStudyLogSummary
  updateStudyLog: UpdateStudyLog
}>

export function StudyLogPage({
  addStudyLog,
  deleteStudyLog,
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

  async function handleDeleteStudyLog(studyLogId: string): Promise<void> {
    await deleteStudyLog(studyLogId)
    reload()
  }

  return (
    <StudyLogView
      {...state}
      onAddStudyLog={handleAddStudyLog}
      onDeleteStudyLog={handleDeleteStudyLog}
      onReload={reload}
      onUpdateStudyLog={handleUpdateStudyLog}
    />
  )
}
