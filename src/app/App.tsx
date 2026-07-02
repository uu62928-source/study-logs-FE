import { configureStudyLog, StudyLogPage } from '@/features/study-log'

const { getStudyLogSummary, updateStudyLog } = configureStudyLog()

export function App() {
  return (
    <StudyLogPage
      getStudyLogSummary={getStudyLogSummary}
      updateStudyLog={updateStudyLog}
    />
  )
}
