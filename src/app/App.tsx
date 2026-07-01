import { configureStudyLog, StudyLogPage } from '@/features/study-log'

const { getStudyLogSummary } = configureStudyLog()

export function App() {
  return <StudyLogPage getStudyLogSummary={getStudyLogSummary} />
}
