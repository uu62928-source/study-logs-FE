import { configureStudyLog, StudyLogPage } from '@/features/study-log'

const { addStudyLog, deleteStudyLog, getStudyLogSummary, updateStudyLog } =
  configureStudyLog()

export function App() {
  return (
    <StudyLogPage
      addStudyLog={addStudyLog}
      deleteStudyLog={deleteStudyLog}
      getStudyLogSummary={getStudyLogSummary}
      updateStudyLog={updateStudyLog}
    />
  )
}
