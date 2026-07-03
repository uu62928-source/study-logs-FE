import { configureStudyLog, StudyLogPage } from '@/features/study-log'

const { addStudyLog, getStudyLogSummary, updateStudyLog } = configureStudyLog()

export function App() {
  return (
    <StudyLogPage
      addStudyLog={addStudyLog}
      getStudyLogSummary={getStudyLogSummary}
      updateStudyLog={updateStudyLog}
    />
  )
}
