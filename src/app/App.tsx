import { configureStudyLog, StudyLogPage } from '@/features/study-log'

const apiBaseUrl =
  import.meta.env.VITE_STUDY_LOG_API_URL ?? 'http://localhost:3000'
const { addStudyLog, deleteStudyLog, getStudyLogSummary, updateStudyLog } =
  configureStudyLog({ apiBaseUrl })

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
